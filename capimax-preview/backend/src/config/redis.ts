import Redis from 'ioredis';
import logger from '../utils/logger';

let redisClient: Redis | null = null;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  db: 0
};

export async function connectRedis(): Promise<void> {
  try {
    if (process.env.REDIS_URL) {
      redisClient = new Redis(process.env.REDIS_URL);
    } else {
      redisClient = new Redis(redisConfig);
    }

    redisClient.on('connect', () => {
      logger.info('✅ Redis connection established');
    });

    redisClient.on('error', (error) => {
      logger.error('❌ Redis connection error:', error);
    });

    redisClient.on('ready', () => {
      logger.info('🚀 Redis client ready');
    });

    redisClient.on('close', () => {
      logger.info('🔒 Redis connection closed');
    });

    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
    }
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    throw error;
  }
}

// Cache utilities
export class RedisCache {
  static async get(key: string): Promise<string | null> {
    try {
      if (!redisClient) return null;
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  static async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!redisClient) return false;
      if (ttlSeconds) {
        await redisClient.setex(key, ttlSeconds, value);
      } else {
        await redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      if (!redisClient) return false;
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      if (!redisClient) return false;
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  }

  static async incr(key: string): Promise<number> {
    try {
      if (!redisClient) return 0;
      return await redisClient.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', error);
      return 0;
    }
  }

  static async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!redisClient) return false;
      const result = await redisClient.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  static async hget(key: string, field: string): Promise<string | null> {
    try {
      if (!redisClient) return null;
      return await redisClient.hget(key, field);
    } catch (error) {
      logger.error('Redis HGET error:', error);
      return null;
    }
  }

  static async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      if (!redisClient) return false;
      await redisClient.hset(key, field, value);
      return true;
    } catch (error) {
      logger.error('Redis HSET error:', error);
      return false;
    }
  }

  static async hgetall(key: string): Promise<Record<string, string>> {
    try {
      if (!redisClient) return {};
      return await redisClient.hgetall(key);
    } catch (error) {
      logger.error('Redis HGETALL error:', error);
      return {};
    }
  }
}

// Session store
export class SessionStore {
  static async createSession(sessionId: string, data: any, ttlSeconds: number = 3600): Promise<boolean> {
    return RedisCache.set(`session:${sessionId}`, JSON.stringify(data), ttlSeconds);
  }

  static async getSession(sessionId: string): Promise<any> {
    const data = await RedisCache.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  static async destroySession(sessionId: string): Promise<boolean> {
    return RedisCache.del(`session:${sessionId}`);
  }

  static async refreshSession(sessionId: string, ttlSeconds: number = 3600): Promise<boolean> {
    return RedisCache.expire(`session:${sessionId}`, ttlSeconds);
  }
}

export { redisClient };
export default redisClient;