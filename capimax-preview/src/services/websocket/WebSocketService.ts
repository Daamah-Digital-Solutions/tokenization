import type { WebSocketEvent } from '../api/types';

export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  id?: string;
}

export interface NotificationHandler {
  (notification: WebSocketEvent): void;
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

export class WebSocketService {
  private socket: WebSocket | null = null;
  private config: WebSocketConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private eventHandlers = new Map<string, Set<Function>>();
  private statusHandlers = new Set<(status: WebSocketStatus) => void>();
  private authToken: string | null = null;

  constructor(config: Partial<WebSocketConfig> = {}) {
    // Use environment variable or derive from API URL
    const defaultWsUrl = import.meta.env.VITE_WEBSOCKET_URL ||
      (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws').replace('/api/v1', '/ws')
        : 'ws://127.0.0.1:8000/ws');

    this.config = {
      url: defaultWsUrl,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      ...config
    };
  }

  /**
   * Set authentication token for WebSocket connection
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.socket && this.isConnected) {
      console.warn('WebSocket is already connected');
      return;
    }

    this.updateStatus('connecting');
    console.log('Connecting to WebSocket:', this.config.url);

    try {
      // Add auth token to connection URL if available
      const url = this.authToken 
        ? `${this.config.url}?token=${encodeURIComponent(this.authToken)}`
        : this.config.url;

      this.socket = new WebSocket(url);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.updateStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    console.log('Disconnecting WebSocket');
    
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.updateStatus('disconnected');
  }

  /**
   * Send message to WebSocket server
   */
  public send(message: WebSocketMessage): void {
    if (this.isConnected && this.socket) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        // Queue message for retry
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      console.warn('WebSocket not connected, message queued');
    }
  }

  /**
   * Subscribe to specific event type
   */
  public on(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from specific event type
   */
  public off(eventType: string, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
  }

  /**
   * Subscribe to connection status changes
   */
  public onStatusChange(handler: (status: WebSocketStatus) => void): void {
    this.statusHandlers.add(handler);
  }

  /**
   * Unsubscribe from connection status changes
   */
  public offStatusChange(handler: (status: WebSocketStatus) => void): void {
    this.statusHandlers.delete(handler);
  }

  /**
   * Get current connection status
   */
  public getStatus(): WebSocketStatus {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return this.reconnectTimer ? 'reconnecting' : 'disconnected';
      default:
        return 'error';
    }
  }

  /**
   * Check if WebSocket is connected
   */
  public isSocketConnected(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Join a room for targeted notifications
   */
  public joinRoom(roomId: string): void {
    this.send({
      type: 'join_room',
      data: { room_id: roomId },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Leave a room
   */
  public leaveRoom(roomId: string): void {
    this.send({
      type: 'leave_room',
      data: { room_id: roomId },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Subscribe to property updates
   */
  public subscribeToProperty(propertyId: string): void {
    this.joinRoom(`property_${propertyId}`);
  }

  /**
   * Unsubscribe from property updates
   */
  public unsubscribeFromProperty(propertyId: string): void {
    this.leaveRoom(`property_${propertyId}`);
  }

  /**
   * Subscribe to user-specific notifications
   */
  public subscribeToUserNotifications(userId: string): void {
    this.joinRoom(`user_${userId}`);
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.onopen = (event) => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateStatus('connected');
      
      // Send queued messages
      this.processMessageQueue();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Emit connection event
      this.emit('connected', { event });
    };

    this.socket.onmessage = (event) => {
      try {
        const message: WebSocketEvent = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        
        // Handle special system messages
        if (message.event === 'pong') {
          // Heartbeat response
          return;
        }
        
        // Emit specific event
        this.emit(message.event, message);
        
        // Emit generic message event
        this.emit('message', message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.clearHeartbeatTimer();
      
      if (event.code !== 1000) { // Not a normal close
        this.updateStatus('error');
        this.scheduleReconnect();
      } else {
        this.updateStatus('disconnected');
      }
      
      this.emit('disconnected', { event });
    };

    this.socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.updateStatus('error');
      this.emit('error', { event });
    };
  }

  /**
   * Emit event to handlers
   */
  private emit(eventType: string, data: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Update connection status and notify handlers
   */
  private updateStatus(status: WebSocketStatus): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in WebSocket status handler:', error);
      }
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.updateStatus('error');
      return;
    }

    this.clearReconnectTimer();
    this.reconnectAttempts++;
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${this.config.reconnectInterval}ms`);
    
    this.updateStatus('reconnecting');
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.clearHeartbeatTimer();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isSocketConnected()) {
        this.send({
          type: 'ping',
          data: {},
          timestamp: new Date().toISOString()
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Clear heartbeat timer
   */
  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isSocketConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Convenience methods for common use cases
export class NotificationService {
  /**
   * Subscribe to real-time notifications
   */
  static subscribe(handler: NotificationHandler): void {
    webSocketService.on('notification', handler);
  }

  /**
   * Unsubscribe from notifications
   */
  static unsubscribe(handler: NotificationHandler): void {
    webSocketService.off('notification', handler);
  }

  /**
   * Subscribe to investment updates
   */
  static subscribeToInvestmentUpdates(handler: (data: any) => void): void {
    webSocketService.on('investment_update', handler);
  }

  /**
   * Subscribe to property updates
   */
  static subscribeToPropertyUpdates(propertyId: string, handler: (data: any) => void): void {
    webSocketService.subscribeToProperty(propertyId);
    webSocketService.on('property_update', handler);
  }

  /**
   * Subscribe to construction updates
   */
  static subscribeToConstructionUpdates(propertyId: string, handler: (data: any) => void): void {
    webSocketService.subscribeToProperty(propertyId);
    webSocketService.on('construction_update', handler);
  }

  /**
   * Subscribe to payment updates
   */
  static subscribeToPaymentUpdates(handler: (data: any) => void): void {
    webSocketService.on('payment_update', handler);
  }

  /**
   * Subscribe to KYC updates
   */
  static subscribeToKYCUpdates(handler: (data: any) => void): void {
    webSocketService.on('kyc_update', handler);
  }

  /**
   * Subscribe to broker commission updates
   */
  static subscribeToBrokerUpdates(handler: (data: any) => void): void {
    webSocketService.on('broker_update', handler);
  }
}

export default webSocketService;