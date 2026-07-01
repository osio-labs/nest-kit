import { CredentialsStrategy } from './credentials.strategy';
import type { IUserService, IAuthUser } from '../../interfaces';
import { JwtService } from '../../session/jwt.service';
import { PasswordService } from '../../password/password.service';
import type { ITokenPair } from '../../interfaces';

describe('CredentialsStrategy', () => {
  let strategy: CredentialsStrategy;
  let mockUserService: jest.Mocked<IUserService>;
  let mockPasswordService: jest.Mocked<PasswordService>;
  let mockJwtService: jest.Mocked<JwtService>;

  const mockUser: IAuthUser = {
    id: 'user-1',
    email: 'test@test.com',
    roles: [],
    permissions: [],
  };

  const mockTokens: ITokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 900,
  };

  beforeEach(() => {
    mockUserService = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
      findByUsername: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findBySocialId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      validatePassword: jest.fn().mockResolvedValue(true),
      setPassword: jest.fn(),
      getTotpSecret: jest.fn(),
      setTotpSecret: jest.fn(),
      getRoles: jest.fn().mockResolvedValue([]),
      getPermissions: jest.fn().mockResolvedValue([]),
    };

    mockPasswordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    } as any as jest.Mocked<PasswordService>;

    mockJwtService = {
      signTokens: jest.fn().mockResolvedValue(mockTokens),
    } as any as jest.Mocked<JwtService>;

    strategy = new CredentialsStrategy(mockUserService, mockPasswordService, mockJwtService);
  });

  it('should authenticate with valid email + password', async () => {
    const result = await strategy.authenticate({
      email: 'test@test.com',
      password: 'correct-pw',
    });

    expect(result.user).toEqual(mockUser);
    expect(result.tokens).toEqual(mockTokens);
  });

  it('should throw if password is missing', async () => {
    await expect(strategy.authenticate({ email: 'test@test.com' })).rejects.toThrow(
      'Password is required',
    );
  });

  it('should throw if user not found', async () => {
    mockUserService.findByEmail.mockResolvedValue(null);
    await expect(
      strategy.authenticate({ email: 'unknown@test.com', password: 'pw' }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('should throw if password is wrong', async () => {
    mockUserService.validatePassword.mockResolvedValue(false);
    await expect(
      strategy.authenticate({ email: 'test@test.com', password: 'wrong' }),
    ).rejects.toThrow('Invalid credentials');
  });
});
