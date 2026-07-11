import { MagicLinkStrategy } from './magic-link.strategy.js';
import type { ICacheService, IUserService, IAuthUser, ITokenPair } from '../../interfaces/index.js';
import { JwtService } from '../../session/jwt.service.js';

describe('MagicLinkStrategy', () => {
  let strategy: MagicLinkStrategy;
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

    strategy = new MagicLinkStrategy(mockCache, mockUserService, mockJwtService);
  });

  describe('requestLink', () => {
    it('should generate and store a token', async () => {
      const token = await strategy.requestLink('test@test.com');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('magic:'),
        expect.objectContaining({ email: 'test@test.com', used: false }),
        900,
      );
    });
  });

  describe('authenticate', () => {
    it('should authenticate with a valid token', async () => {
      mockCache.get.mockResolvedValue({ email: 'test@test.com', used: false });
      const result = await strategy.authenticate({ token: 'valid-token' });
      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should throw if token is missing', async () => {
      await expect(strategy.authenticate({})).rejects.toThrow('Magic link token is required');
    });

    it('should throw if token is expired', async () => {
      mockCache.get.mockResolvedValue(undefined);
      await expect(strategy.authenticate({ token: 'expired-token' })).rejects.toThrow(
        'Invalid or expired magic link',
      );
    });

    it('should throw if token was already used', async () => {
      mockCache.get.mockResolvedValue({ email: 'test@test.com', used: true });
      await expect(strategy.authenticate({ token: 'used-token' })).rejects.toThrow(
        'already been used',
      );
    });

    it('should create user if not existing', async () => {
      mockCache.get.mockResolvedValue({ email: 'new@test.com', used: false });
      mockUserService.findByEmail.mockResolvedValue(null);
      const newUser: IAuthUser = {
        id: 'new-user',
        email: undefined, // new user created without email field initially
        roles: [],
        permissions: [],
      };
      mockUserService.create.mockResolvedValue(newUser);

      const result = await strategy.authenticate({ token: 'new-user-token' });
      expect(mockUserService.create).toHaveBeenCalledWith({
        email: 'new@test.com',
      });
      expect(result.isNewUser).toBe(true);
    });
  });
});
