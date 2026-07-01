import { AuthService } from './auth.service';
import {
  AuthMethod,
  type IAuthStrategy,
  type ICacheService,
  type IAuthResult,
  type ITokenPair,
} from './interfaces';
import { JwtService } from './session/jwt.service';
import { TokenBlacklistService } from './session/token-blacklist.service';
import { DeviceSessionService } from './session/device-session.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockJwt: jest.Mocked<JwtService>;
  let mockBlacklist: jest.Mocked<TokenBlacklistService>;
  let mockDeviceSession: jest.Mocked<DeviceSessionService>;
  let mockCache: jest.Mocked<ICacheService>;
  let mockStrategy: jest.Mocked<IAuthStrategy>;
  let mockRefreshStrategy: jest.Mocked<IAuthStrategy>;

  const mockTokens: ITokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 900,
  };

  const mockAuthResult: IAuthResult = {
    user: { id: 'user-1', email: 'test@test.com', roles: [], permissions: [] },
    tokens: mockTokens,
  };

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    mockJwt = {
      signTokens: jest.fn().mockResolvedValue(mockTokens),
      verifyAccess: jest.fn().mockResolvedValue({
        sub: 'user-1',
        email: 'test@test.com',
        roles: [],
        permissions: [],
        jti: 'jti-123',
        exp: 9999999999,
      }),
      verifyRefresh: jest.fn().mockResolvedValue({
        sub: 'user-1',
        email: 'test@test.com',
        jti: 'jti-refresh',
        exp: 9999999999,
      }),
      decode: jest.fn().mockReturnValue({
        sub: 'user-1',
        jti: 'jti-123',
        exp: 9999999999,
      }),
    } as any;

    mockBlacklist = {
      blacklistAccess: jest.fn(),
      isBlacklisted: jest.fn().mockResolvedValue(false),
      revokeFamily: jest.fn(),
      isFamilyRevoked: jest.fn().mockResolvedValue(false),
      remove: jest.fn(),
    } as any;

    mockDeviceSession = {
      register: jest.fn(),
      getUserSessions: jest.fn().mockResolvedValue([]),
      getSession: jest.fn().mockResolvedValue(null),
      removeSession: jest.fn(),
      removeAllUserSessions: jest.fn(),
    } as any;

    mockStrategy = {
      type: AuthMethod.CREDENTIALS,
      name: 'credentials',
      authenticate: jest.fn().mockResolvedValue(mockAuthResult),
    };

    mockRefreshStrategy = {
      type: AuthMethod.MAGIC_LINK,
      name: 'magic-link',
      authenticate: jest.fn().mockResolvedValue(mockAuthResult),
    };

    service = new AuthService(
      { session: { multiDevice: false, rotation: true } } as any,
      [mockStrategy, mockRefreshStrategy],
      mockCache,
      mockJwt,
      mockBlacklist,
      mockDeviceSession,
    );
  });

  describe('authenticate', () => {
    it('should delegate to the correct strategy', async () => {
      const result = await service.authenticate(AuthMethod.CREDENTIALS, {
        email: 'test@test.com',
        password: 'pw',
      });
      expect(mockStrategy.authenticate).toHaveBeenCalledWith(
        { email: 'test@test.com', password: 'pw' },
        undefined,
      );
      expect(result).toEqual(mockAuthResult);
    });

    it('should throw if strategy is not enabled', async () => {
      await expect(service.authenticate(AuthMethod.SSO, {})).rejects.toThrow('not enabled');
    });

    it('should track device session when multiDevice is enabled', async () => {
      const svc = new AuthService(
        { session: { multiDevice: true, rotation: true } } as any,
        [mockStrategy],
        mockCache,
        mockJwt,
        mockBlacklist,
        mockDeviceSession,
      );

      await svc.authenticate(AuthMethod.CREDENTIALS, {
        email: 'test@test.com',
        password: 'pw',
        deviceId: 'device-1',
        userAgent: 'Mozilla',
        ip: '127.0.0.1',
      });

      expect(mockDeviceSession.register).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'device-1', userId: 'user-1' }),
      );
    });
  });

  describe('validateToken', () => {
    it('should verify and cache token', async () => {
      const result = await service.validateToken('valid-token');
      expect(result).toHaveProperty('sub', 'user-1');
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:token:'),
        expect.any(Object),
        30,
      );
    });

    it('should use cache on subsequent calls', async () => {
      mockCache.get.mockResolvedValue({ sub: 'cached-user' });
      const result = await service.validateToken('some-token');
      expect(result).toHaveProperty('sub', 'cached-user');
      expect(mockJwt.verifyAccess).not.toHaveBeenCalled();
    });

    it('should throw if token is blacklisted', async () => {
      mockBlacklist.isBlacklisted.mockResolvedValue(true);
      await expect(service.validateToken('blacklisted-token')).rejects.toThrow('revoked');
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens from refresh token', async () => {
      const result = await service.refreshToken('valid-refresh');
      expect(result).toEqual(mockTokens);
    });

    it('should check family revocation', async () => {
      mockBlacklist.isFamilyRevoked.mockResolvedValue(true);
      await expect(service.refreshToken('revoked-refresh')).rejects.toThrow('revoked');
    });

    it('should blacklist old refresh token in rotation mode', async () => {
      await service.refreshToken('valid-refresh');
      expect(mockBlacklist.blacklistAccess).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should blacklist access token', async () => {
      await service.logout('some-token');
      expect(mockBlacklist.blacklistAccess).toHaveBeenCalled();
    });

    it('should remove device session if deviceId provided', async () => {
      await service.logout('some-token', 'device-1');
      expect(mockDeviceSession.removeSession).toHaveBeenCalledWith('user-1', 'device-1');
    });
  });

  describe('logoutAll / getUserSessions', () => {
    it('should clear all user sessions', async () => {
      await service.logoutAll('user-1');
      expect(mockDeviceSession.removeAllUserSessions).toHaveBeenCalledWith('user-1');
    });

    it('should return user sessions', async () => {
      await service.getUserSessions('user-1');
      expect(mockDeviceSession.getUserSessions).toHaveBeenCalledWith('user-1');
    });
  });
});
