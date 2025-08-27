import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { User } from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export function initializeSocketIO(io: SocketIOServer): void {
  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await User.findByPk(decoded.userId);
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid or inactive user'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      
      logger.info(`User ${user.email} connected via Socket.IO`);
      next();
    } catch (error) {
      logger.error('Socket.IO authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    logger.info(`Socket connected: ${socket.id} for user: ${userId}`);

    // Join user-specific room
    if (userId) {
      socket.join(`user:${userId}`);
      
      // Join role-specific room
      if (userRole) {
        socket.join(`role:${userRole}`);
      }
    }

    // Handle investment updates subscription
    socket.on('subscribe:investments', () => {
      if (userId) {
        socket.join(`investments:${userId}`);
        logger.info(`User ${userId} subscribed to investment updates`);
      }
    });

    // Handle property updates subscription
    socket.on('subscribe:properties', (propertyIds: string[]) => {
      propertyIds.forEach(propertyId => {
        socket.join(`property:${propertyId}`);
      });
      logger.info(`User ${userId} subscribed to property updates: ${propertyIds.join(', ')}`);
    });

    // Handle KYC updates subscription
    socket.on('subscribe:kyc', () => {
      if (userId) {
        socket.join(`kyc:${userId}`);
        logger.info(`User ${userId} subscribed to KYC updates`);
      }
    });

    // Handle payment updates subscription
    socket.on('subscribe:payments', () => {
      if (userId) {
        socket.join(`payments:${userId}`);
        logger.info(`User ${userId} subscribed to payment updates`);
      }
    });

    // Handle admin subscriptions
    socket.on('subscribe:admin', () => {
      if (userRole === 'admin') {
        socket.join('admin:notifications');
        socket.join('admin:kyc-reviews');
        socket.join('admin:property-approvals');
        logger.info(`Admin user ${userId} subscribed to admin updates`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} for user: ${userId}, reason: ${reason}`);
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to Capimax real-time service',
      userId,
      timestamp: new Date().toISOString()
    });
  });

  logger.info('Socket.IO server initialized');
}

// Utility functions for sending real-time updates
export class SocketService {
  static emitToUser(userId: string, event: string, data: any): void {
    global.socketIO.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static emitToRole(role: string, event: string, data: any): void {
    global.socketIO.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static emitInvestmentUpdate(userId: string, data: any): void {
    this.emitToUser(userId, 'investment:status_update', data);
    global.socketIO.to(`investments:${userId}`).emit('investment:status_update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static emitPropertyUpdate(propertyId: string, data: any): void {
    global.socketIO.to(`property:${propertyId}`).emit('property:funding_update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static emitKYCUpdate(userId: string, data: any): void {
    this.emitToUser(userId, 'kyc:status_update', data);
    global.socketIO.to(`kyc:${userId}`).emit('kyc:status_update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static emitPaymentUpdate(userId: string, data: any): void {
    this.emitToUser(userId, 'payment:status_update', data);
    global.socketIO.to(`payments:${userId}`).emit('payment:status_update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static emitAdminNotification(data: any): void {
    global.socketIO.to('admin:notifications').emit('admin:notification', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static emitNewKYCReview(data: any): void {
    global.socketIO.to('admin:kyc-reviews').emit('admin:new_kyc_review', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static emitNewPropertyApproval(data: any): void {
    global.socketIO.to('admin:property-approvals').emit('admin:new_property_approval', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  static broadcastSystemNotification(data: any): void {
    global.socketIO.emit('system:notification', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}

export default initializeSocketIO;