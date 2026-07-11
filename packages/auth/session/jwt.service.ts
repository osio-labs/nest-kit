import { Injectable, Inject } from '@nestjs/common';
import type { IAuthUser, ITokenPair } from '../interfaces/index.js';
import type { SessionOptions } from '../auth.options.js';
import { AUTH_MODULE_OPTIONS } from '../auth.constants.js';

/**
 * Low-level JWT service that signs and verifies tokens
 * using `@nestjs/jwt` (loaded dynamically so the dependency is optional).
 */
@Injectable()
export class JwtService {
  private nestJwt: typeof import('@nestjs/jwt') | null = null;
  private jwtServiceInstance: import('@nestjs/jwt').JwtService | null = null;
  private resolved = false;

  constructor(
    @Inject(AUTH_MODULE_OPTIONS)
    private readonly options: {
      jwtSecret?: string;
      jwtPrivateKey?: string;
      jwtPublicKey?: string;
      session?: SessionOptions;
    },
  ) {}

  /**
   * Generate an access + refresh token pair for the given user.
   */
  async signTokens(user: IAuthUser): Promise<ITokenPair> {
    const jwt = await this.getInstance();
    const session = this.options.session ?? {};
    const accessExp = session.accessTokenExpiresIn ?? '15m';
    const refreshExp = session.refreshTokenExpiresIn ?? '7d';

    const payload: Record<string, unknown> = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
      isAnonymous: user.isAnonymous ?? false,
      isMfaVerified: user.isMfaVerified ?? false,
    };

    const accessToken = jwt.sign(payload, {
      expiresIn: accessExp as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });
    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: refreshExp as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(accessExp),
    };
  }

  /**
   * Verify and decode an access token. Throws if invalid / expired.
   */
  async verifyAccess(token: string): Promise<Record<string, unknown>> {
    const jwt = await this.getInstance();
    return jwt.verifyAsync(token);
  }

  /**
   * Verify a refresh token. Throws if invalid / expired.
   */
  async verifyRefresh(token: string): Promise<Record<string, unknown>> {
    const jwt = await this.getInstance();
    return jwt.verifyAsync(token);
  }

  /**
   * Decode a token without verification (useful for extracting metadata).
   */
  decode(token: string): Record<string, unknown> | null {
    if (!this.jwtServiceInstance) return null;
    return this.jwtServiceInstance.decode(token);
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 900;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return num * (multipliers[unit] ?? 1);
  }

  private async getInstance(): Promise<import('@nestjs/jwt').JwtService> {
    if (!this.resolved) {
      try {
        this.nestJwt = await import('@nestjs/jwt');
        const secretOrPrivateKey = this.options.jwtSecret ?? this.options.jwtPrivateKey;
        this.jwtServiceInstance = new this.nestJwt.JwtService({
          secret: secretOrPrivateKey,
          publicKey: this.options.jwtPublicKey,
          signOptions: {
            algorithm: this.options.session?.algorithm ?? 'HS256',
            issuer: this.options.session?.issuer,
            audience: this.options.session?.audience,
          },
        });
      } catch {
        throw new Error('JwtService requires "@nestjs/jwt". Run: npm install @nestjs/jwt');
      }
      this.resolved = true;
    }
    return this.jwtServiceInstance!;
  }
}
