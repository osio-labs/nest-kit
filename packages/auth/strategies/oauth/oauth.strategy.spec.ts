import { OAuthStrategy } from './oauth.strategy.js';
import { OAuthProviderRegistry } from './oauth-provider-registry.js';
import type { IUserService, IAuthUser, ITokenPair } from '../../interfaces/index.js';
import { JwtService } from '../../session/jwt.service.js';

describe('OAuthStrategy', () => {
  let strategy: OAuthStrategy;
  let registry: OAuthProviderRegistry;
  let mockUserService: jest.Mocked<IUserService>;
  let mockJwtService: jest.Mocked<JwtService>;

  const mockUser: IAuthUser = {
    id: 'user-1',
    email: 'oauth@test.com',
    roles: [],
    permissions: [],
  };

  const mockTokens: ITokenPair = {
    accessToken: 'token',
    refreshToken: 'refresh',
    expiresIn: 900,
  };

  beforeEach(() => {
    mockUserService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      findBySocialId: jest.fn().mockResolvedValue(mockUser),
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

    registry = new OAuthProviderRegistry();
    registry.register('google', {
      clientId: 'google-client-id',
      clientSecret: 'google-client-secret',
      callbackUrl: 'http://localhost:3000/auth/google/callback',
    });

    strategy = new OAuthStrategy(mockUserService, mockJwtService, registry);
  });

  it('should authenticate with registered provider', async () => {
    const result = await strategy.authenticate({
      provider: 'google',
      code: 'auth-code',
      sub: 'google-user-123',
      email: 'oauth@test.com',
    });

    expect(result.user).toEqual(mockUser);
    expect(result.tokens).toEqual(mockTokens);
    expect(mockUserService.findBySocialId).toHaveBeenCalledWith('google', 'google:google-user-123');
  });

  it('should throw if provider is missing', async () => {
    await expect(strategy.authenticate({ code: 'auth-code' })).rejects.toThrow(
      'OAuth provider is required',
    );
  });

  it('should throw if code and accessToken are missing', async () => {
    await expect(strategy.authenticate({ provider: 'google' })).rejects.toThrow(
      'authorization code or access token is required',
    );
  });

  it('should throw for unsupported provider', async () => {
    await expect(strategy.authenticate({ provider: 'unknown', code: 'code' })).rejects.toThrow(
      'Unsupported OAuth provider',
    );
  });

  it('should create user if not found by social ID', async () => {
    mockUserService.findBySocialId.mockResolvedValue(null);
    mockUserService.create.mockResolvedValue(mockUser);

    const result = await strategy.authenticate({
      provider: 'google',
      code: 'auth-code',
      sub: 'new-google-user',
      email: 'new@test.com',
    });

    expect(mockUserService.create).toHaveBeenCalled();
  });
});
