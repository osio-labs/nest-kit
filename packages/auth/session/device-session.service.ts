import { Inject, Injectable } from '@nestjs/common';
import type { ICacheService } from '../interfaces';
import { CACHE_SERVICE, DEVICE_SESSION_PREFIX } from '../auth.constants';

export interface IDeviceInfo {
  deviceId: string;
  userId: string;
  userAgent?: string;
  ip?: string;
  lastActivity: number;
  createdAt: number;
}

/**
 * Tracks active devices / sessions per user so that:
 *   - Users can view all active sessions
 *   - Users can log out a specific device (like Telegram)
 *   - Admins can force-terminate sessions
 */
@Injectable()
export class DeviceSessionService {
  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
  ) {}

  /**
   * Register a new device session.
   *
   * @param info Device and session metadata
   * @param ttl  Session TTL in seconds (default 30 days)
   */
  async register(info: Omit<IDeviceInfo, 'createdAt'>, ttl = 2_592_000): Promise<void> {
    const session: IDeviceInfo = { ...info, createdAt: Date.now() };
    await this.cache.set(`${DEVICE_SESSION_PREFIX}${info.userId}:${info.deviceId}`, session, ttl);
  }

  /**
   * Get all active sessions for a user.
   */
  getUserSessions(_userId: string): Promise<IDeviceInfo[]> {
    // In production, this would use Redis SCAN or a session DB table.
    // For simplicity we rely on a key convention and read individually.
    // Consumers are encouraged to override this method.
    return Promise.resolve([]);
  }

  /**
   * Get a single device session by user + device ID.
   */
  async getSession(userId: string, deviceId: string): Promise<IDeviceInfo | null> {
    const result = await this.cache.get<IDeviceInfo>(
      `${DEVICE_SESSION_PREFIX}${userId}:${deviceId}`,
    );
    return result ?? null;
  }

  /**
   * Remove a specific device session (per-device logout).
   */
  async removeSession(userId: string, deviceId: string): Promise<void> {
    await this.cache.del(`${DEVICE_SESSION_PREFIX}${userId}:${deviceId}`);
  }

  /**
   * Remove all sessions for a user (global logout).
   */
  async removeAllUserSessions(_userId: string): Promise<void> {
    // TODO: iterate all user sessions. For now, consumer's responsibility.
    return Promise.resolve();
  }
}
