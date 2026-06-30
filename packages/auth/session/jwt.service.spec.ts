import { JwtService } from './jwt.service';
import type { IAuthUser } from '../interfaces';

// Mock @nestjs/jwt
jest.mock('@nestjs/jwt', () => {
  const mockSign = jest.fn().mockReturnValue('signed-jwt-token');
  const mockVerify = jest.fn().mockImplementation((token: string) => {
    if (token === 'invalid') throw new Error('Invalid token');
    return {
      sub: 'user-1',
      email: 'test@example.com',
      roles: ['admin'],
      iat: 123,
      exp: 456,
    };
  });
  const mockDecode = jest.fn().mockReturnValue({
    sub: 'user-1',
    jti: 'jti-123',
    exp: 456,
  });

  return {
    JwtService: jest.fn().mockImplementation(() => ({
      sign: mockSign,
      signAsync: mockSign,
      verify: mockVerify,
      verifyAsync: mockVerify,
      decode: mockDecode,
    })),
  };
});

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(() => {
    service = new JwtService({
      jwtSecret: 'test-secret',
      session: {
        accessTokenExpiresIn: '15m',
        refreshTokenExpiresIn: '7d',
        algorithm: 'HS256',
        issuer: 'test',
        audience: 'test-audience',
      },
    });
  });

  describe('signTokens', () => {
    it('should return a token pair', async () => {
      const user: IAuthUser = {
        id: 'user-1',
        email: 'test@example.com',
        roles: ['admin'],
        permissions: ['read'],
      };

      const result = await service.signTokens(user);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result.accessToken).toBe('signed-jwt-token');
    });
  });

  describe('verifyAccess', () => {
    it('should verify and return payload', async () => {
      const result = await service.verifyAccess('valid-token');
      expect(result).toHaveProperty('sub', 'user-1');
    });

    it('should throw for invalid token', async () => {
      await expect(service.verifyAccess('invalid')).rejects.toThrow('Invalid token');
    });
  });

  describe('verifyRefresh', () => {
    it('should verify refresh token', async () => {
      const result = await service.verifyRefresh('valid-refresh-token');
      expect(result).toHaveProperty('sub');
    });
  });

  describe('decode', () => {
    it('should return null if service not initialized', () => {
      const freshService = new JwtService({ jwtSecret: 'test' });
      expect(freshService.decode('token')).toBeNull();
    });
  });
});
