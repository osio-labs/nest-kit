import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult, type ICacheService } from '../../interfaces';
import type { IUserService } from '../../interfaces';
import { CACHE_SERVICE, MAGIC_LINK_PREFIX, USER_SERVICE } from '../../auth.constants';
import { JwtService } from '../../session/jwt.service';
import { BaseStrategy } from '../base/base.strategy';
import { randomBytes } from 'node:crypto';

/**
 * Passwordless email login via magic links.
 *
 * Flow:
 *   1. User enters their email → a token is generated and stored in cache
 *   2. Email is sent with a link containing the token
 *   3. User clicks the link → token is validated → user is signed in
 */
@Injectable()
export class MagicLinkStrategy extends BaseStrategy {
  readonly type = AuthMethod.MAGIC_LINK;
  readonly name = 'magic-link';

  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  /**
   * Request a magic link for the given email.
   * Returns the raw token (in production, send this via email).
   */
  async requestLink(email: string, expiresIn = 900, tokenBytes = 32): Promise<string> {
    const token = randomBytes(tokenBytes).toString('hex');
    await this.cache.set(`${MAGIC_LINK_PREFIX}${token}`, { email, used: false }, expiresIn);
    return token;
  }

  /**
   * Authenticate using a magic-link token.
   */
  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const token = payload.token as string;

    if (!token) {
      throw new Error('Magic link token is required');
    }

    const data = await this.cache.get<{ email: string; used: boolean }>(
      `${MAGIC_LINK_PREFIX}${token}`,
    );

    if (!data) {
      throw new Error('Invalid or expired magic link');
    }

    if (data.used) {
      throw new Error('Magic link has already been used');
    }

    // Mark as used immediately (prevent replay)
    await this.cache.set(`${MAGIC_LINK_PREFIX}${token}`, { ...data, used: true }, 60);

    const existingUser = await this.userService.findByEmail(data.email);
    let finalUser: import('../../interfaces').IAuthUser;
    let isNewUser = false;

    if (!existingUser) {
      finalUser = await this.userService.create({ email: data.email });
      isNewUser = true;
    } else {
      finalUser = existingUser;
    }

    finalUser.roles = await this.userService.getRoles(finalUser.id);
    finalUser.permissions = await this.userService.getPermissions(finalUser.id);

    const tokens = await this.jwtService.signTokens(finalUser);

    return { user: finalUser, tokens, isNewUser };
  }
}
