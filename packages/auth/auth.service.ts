import { Inject, Injectable, type ExecutionContext } from '@nestjs/common';
import type { IAuthResult, IAuthStrategy, ICacheService, ITokenPair } from './interfaces';
import { AuthMethod } from './interfaces';
import { AUTH_MODULE_OPTIONS, AUTH_STRATEGIES, CACHE_SERVICE } from './auth.constants';
import type { AuthModuleOptions } from './auth.options';
import { JwtService } from './session/jwt.service';
import { TokenBlacklistService } from './session/token-blacklist.service';
import { DeviceSessionService } from './session/device-session.service';

/**
 * Central authentication orchestrator.
 *
 * Delegates to the appropriate strategy based on `AuthMethod`,
 * manages token lifecycle, session tracking, and cache acceleration.
 */
@Injectable()
export class AuthService {
  private readonly strategyMap = new Map<AuthMethod, IAuthStrategy>();

  constructor(
    @Inject(AUTH_MODULE_OPTIONS)
    private readonly options: AuthModuleOptions,
    @Inject(AUTH_STRATEGIES)
    _strategies: IAuthStrategy[],
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
    private readonly jwtService: JwtService,
    private readonly tokenBlacklist: TokenBlacklistService,
    private readonly deviceSession: DeviceSessionService,
  ) {
    for (const strategy of _strategies) {
      this.strategyMap.set(strategy.type, strategy);
    }
  }

  /**
   * Authenticate using the given method.
   *
   * @param method  Authentication method (e.g. 'credentials', 'oauth')
   * @param payload Strategy-specific payload
   * @param context Optional execution context
   */
  async authenticate(
    method: AuthMethod,
    payload: Record<string, unknown>,
    context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const strategy = this.strategyMap.get(method);
    if (!strategy) {
      throw new Error(`Authentication method "${method}" is not enabled`);
    }

    const result = await strategy.authenticate(payload, context);

    // Track device session if multi-device is enabled
    if (this.options.session?.multiDevice) {
      await this.deviceSession.register({
        deviceId: (payload.deviceId as string) ?? 'default',
        userId: result.user.id,
        userAgent: payload.userAgent as string | undefined,
        ip: payload.ip as string | undefined,
        lastActivity: Date.now(),
      });
    }

    return result;
  }

  /**
   * Validate an access token and return its decoded payload.
   * Uses cache for fast-path validation when available.
   *
   * @param token Raw JWT access token
   */
  async validateToken(token: string): Promise<Record<string, unknown>> {
    // Fast-path: check cache first
    const cacheKey = `auth:token:${this.hash(token)}`;
    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const payload = await this.jwtService.verifyAccess(token);

    // Check blacklist
    const jti = payload.jti as string | undefined;
    if (jti && (await this.tokenBlacklist.isBlacklisted(jti))) {
      throw new Error('Token has been revoked');
    }

    // Cache the validated payload for 30 seconds
    await this.cache.set(cacheKey, payload, 30);

    return payload;
  }

  /**
   * Refresh an expired access token using a refresh token.
   * Implements refresh token rotation.
   */
  async refreshToken(refreshToken: string, deviceId?: string): Promise<ITokenPair> {
    const payload = await this.jwtService.verifyRefresh(refreshToken);
    const userId = payload.sub as string;

    // Check family revocation
    if (this.options.session?.rotation !== false) {
      const familyId = payload.family ?? payload.jti;
      if (familyId && (await this.tokenBlacklist.isFamilyRevoked(familyId as string))) {
        throw new Error('Refresh token family has been revoked');
      }
    }

    // In rotation mode, blacklist the current refresh token
    if (this.options.session?.rotation !== false && payload.jti) {
      const exp = payload.exp as number | undefined;
      const ttl = exp ? Math.max(1, exp - Math.floor(Date.now() / 1000)) : 86400;
      await this.tokenBlacklist.blacklistAccess(payload.jti as string, ttl);
    }

    const user = {
      id: userId,
      email: payload.email as string | undefined,
      username: payload.username as string | undefined,
      roles: payload.roles as string[] | undefined,
      permissions: payload.permissions as string[] | undefined,
      isAnonymous: (payload.isAnonymous as boolean) ?? false,
      isMfaVerified: (payload.isMfaVerified as boolean) ?? false,
    };

    const tokens = await this.jwtService.signTokens(user);

    // Update device session timestamp
    if (deviceId) {
      const session = await this.deviceSession.getSession(userId, deviceId);
      if (session) {
        session.lastActivity = Date.now();
        await this.deviceSession.register(session);
      }
    }

    return tokens;
  }

  /**
   * Logout — blacklist the current access token and optionally
   * remove a specific device session.
   */
  async logout(accessToken: string, deviceId?: string): Promise<void> {
    const payload = this.jwtService.decode(accessToken);
    const jti = (payload?.jti as string) ?? this.hash(accessToken);
    const exp = payload?.exp as number | undefined;
    const ttl = exp ? Math.max(1, exp - Math.floor(Date.now() / 1000)) : 3600;

    await this.tokenBlacklist.blacklistAccess(jti, ttl);

    const userId = payload?.sub as string | undefined;
    if (userId && deviceId) {
      await this.deviceSession.removeSession(userId, deviceId);
    }
  }

  /**
   * Logout from all devices — revoke all sessions for a user.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.deviceSession.removeAllUserSessions(userId);
  }

  /**
   * Get all active sessions for a user (multi-device view).
   */
  async getUserSessions(userId: string) {
    return this.deviceSession.getUserSessions(userId);
  }

  private hash(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}
