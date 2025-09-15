import { useState, useEffect, useCallback } from 'react';
import { WebSocketService } from '../services/websocket/WebSocketService';
import { DashboardService, type DashboardStats } from '../services/dashboard/DashboardService';
import type { Transaction, Property } from '../services/api/types';

export interface RealtimeUpdates {
  stats: DashboardStats | null;
  transactions: Transaction[];
  priceAlerts: Array<{
    propertyId: string;
    propertyName: string;
    previousPrice: number;
    currentPrice: number;
    change: number;
    timestamp: string;
  }>;
  marketUpdates: Array<{
    type: 'price_change' | 'new_listing' | 'transaction_completed';
    propertyId: string;
    data: any;
    timestamp: string;
  }>;
}

export function useRealtimeDashboard() {
  const [isConnected, setIsConnected] = useState(false);
  const [updates, setUpdates] = useState<RealtimeUpdates>({
    stats: null,
    transactions: [],
    priceAlerts: [],
    marketUpdates: []
  });
  const [wsService] = useState(() => new WebSocketService());

  const handleWebSocketMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'dashboard_stats_update':
          setUpdates(prev => ({
            ...prev,
            stats: message.data
          }));
          break;

        case 'new_transaction':
          setUpdates(prev => ({
            ...prev,
            transactions: [message.data, ...prev.transactions.slice(0, 9)] // Keep latest 10
          }));
          break;

        case 'price_alert':
          setUpdates(prev => ({
            ...prev,
            priceAlerts: [message.data, ...prev.priceAlerts.slice(0, 4)] // Keep latest 5
          }));
          break;

        case 'market_update':
          setUpdates(prev => ({
            ...prev,
            marketUpdates: [message.data, ...prev.marketUpdates.slice(0, 9)] // Keep latest 10
          }));
          break;

        case 'portfolio_update':
          // Trigger a refresh of portfolio data
          refreshDashboardData();
          break;

        default:
          console.log('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }, []);

  const refreshDashboardData = useCallback(async () => {
    try {
      const [stats, transactions] = await Promise.all([
        DashboardService.getDashboardStats(),
        DashboardService.getRecentTransactions(10)
      ]);

      setUpdates(prev => ({
        ...prev,
        stats,
        transactions
      }));
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    try {
      wsService.connect();
      
      // Subscribe to dashboard events
      wsService.subscribe('dashboard_updates', handleWebSocketMessage);
      wsService.subscribe('portfolio_updates', handleWebSocketMessage);
      wsService.subscribe('market_updates', handleWebSocketMessage);
      wsService.subscribe('price_alerts', handleWebSocketMessage);

      wsService.onStatusChange((status) => {
        setIsConnected(status === 'connected');
      });

      // Initial data load
      refreshDashboardData();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [handleWebSocketMessage, refreshDashboardData]);

  const disconnectWebSocket = useCallback(() => {
    wsService.disconnect();
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connectWebSocket();

    // Auto-refresh dashboard data every 30 seconds as fallback
    const interval = setInterval(refreshDashboardData, 30000);

    return () => {
      clearInterval(interval);
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket, refreshDashboardData]);

  return {
    isConnected,
    updates,
    refreshData: refreshDashboardData,
    reconnect: connectWebSocket
  };
}