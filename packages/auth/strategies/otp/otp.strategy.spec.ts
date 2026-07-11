import { OtpStrategy } from './otp.strategy.js';
import type { ICacheService, IUserService, IAuthUser, ITokenPair } from '../../interfaces/index.js';
import { JwtService } from '../../session/jwt.service.js';

describe('OtpStrategy', () => {
  let strategy: OtpStrategy;
  let mockCache: jest.Mocked<ICacheService>;
  let mockUserService: jest.Mocked<IUserService>;
  let mockJwtService: jest.Mocked<JwtService>;

  const mockUser: IAuthUser = {
    id: 'user-1',
    email: 'test@test.com',
    roles: [],
    permissions: [],
  };

  const mockTokens: ITokenPair = {
    accessToken: 'token',
    refreshToken: 'refresh',
    expiresIn: 900,
  };

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    mockUserService = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findBySocialId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      validatePassword: jest.fn(),
      setPassword: jest.fn(),
      getTotpSecret: jest.fn(),
      setTotpSecret: jest.fn(),
      getRoles: jest.fn().mockResolvedValue([]),
      getPermissions: jest.fn().mockResolvedValue([]),
    };

    mockJwtService = {
      signTokens: jest.fn().mockResolvedValue(mockTokens),
    } as any as jest.Mocked<JwtService>;

    strategy = new OtpStrategy(mockCache, mockUserService, mockJwtService);
  });

  describe('requestOtp', () => {
    it('should generate and store a numeric code', async () => {
      const code = await strategy.requestOtp('test@test.com', 6);
      expect(code).toMatch(/^\d{6}$/);
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('otp:test@test.com'),
        expect.objectContaining({ code, identifier: 'test@test.com' }),
        300,
      );
    });
  });

  describe('authenticate', () => {
    it('should authenticate with valid code', async () => {
      mockCache.get.mockResolvedValue({
        code: '123456',
        attempts: 0,
        identifier: 'test@test.com',
      });

      const result = await strategy.authenticate({
        identifier: 'test@test.com',
        code: '123456',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
      expect(mockCache.del).toHaveBeenCalledWith(expect.stringContaining('otp:test@test.com'));
    });

    it('should throw if identifier or code missing', async () => {
      await expect(strategy.authenticate({})).rejects.toThrow('identifier and code are required');
    });

    it('should throw if OTP expired', async () => {
      mockCache.get.mockResolvedValue(undefined);
      await expect(
        strategy.authenticate({
          identifier: 'test@test.com',
          code: '000000',
        }),
      ).rejects.toThrow('not found or expired');
    });

    it('should throw if too many attempts', async () => {
      mockCache.get.mockResolvedValue({
        code: '123456',
        attempts: 3,
        identifier: 'test@test.com',
      });

      await expect(
        strategy.authenticate({
          identifier: 'test@test.com',
          code: '000000',
        }),
      ).rejects.toThrow('Too many failed OTP attempts');
    });

    it('should increment attempts on wrong code', async () => {
      mockCache.get.mockResolvedValue({
        code: '123456',
        attempts: 0,
        identifier: 'test@test.com',
      });

      await expect(
        strategy.authenticate({
          identifier: 'test@test.com',
          code: '000000',
        }),
      ).rejects.toThrow('Invalid OTP code');

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ attempts: 1 }),
        expect.any(Number),
      );
    });
  });
});
