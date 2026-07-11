import { AnonymousStrategy } from './anonymous.strategy.js';
import { JwtService } from '../../session/jwt.service.js';
import type { ITokenPair } from '../../interfaces/index.js';

describe('AnonymousStrategy', () => {
  let strategy: AnonymousStrategy;
  let mockJwtService: jest.Mocked<JwtService>;

  const mockTokens: ITokenPair = {
    accessToken: 'anon-token',
    refreshToken: 'anon-refresh',
    expiresIn: 900,
  };

  beforeEach(() => {
    mockJwtService = {
      signTokens: jest.fn().mockResolvedValue(mockTokens),
    } as any as jest.Mocked<JwtService>;

    strategy = new AnonymousStrategy(mockJwtService);
  });

  it('should create an anonymous user', async () => {
    const result = await strategy.authenticate({});
    expect(result.user.isAnonymous).toBe(true);
    expect(result.user.id).toMatch(/^anon_/);
    expect(result.isNewUser).toBe(true);
    expect(result.tokens).toEqual(mockTokens);
  });

  it('should use custom ID prefix', async () => {
    const result = await strategy.authenticate({ idPrefix: 'guest_' });
    expect(result.user.id).toMatch(/^guest_/);
  });

  it('should generate unique IDs', async () => {
    const result1 = await strategy.authenticate({});
    const result2 = await strategy.authenticate({});
    expect(result1.user.id).not.toBe(result2.user.id);
  });
});
