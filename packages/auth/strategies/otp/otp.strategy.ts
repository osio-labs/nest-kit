import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult, type ICacheService } from '../../interfaces';
import type { IUserService } from '../../interfaces';
import { CACHE_SERVICE, OTP_PREFIX, USER_SERVICE } from '../../auth.constants';
import { JwtService } from '../../session/jwt.service';
import { BaseStrategy } from '../base/base.strategy';
import { randomInt } from 'node:crypto';

/**
 * One-Time Password (OTP) authentication via email or phone.
 *
 * Flow:
 *   1. User enters email/phone → a numeric code is generated and stored in cache
 *   2. Code is dispatched via email or SMS (consumer's responsibility)
 *   3. User submits code → validated → signed in
 */
@Injectable()
export class OtpStrategy extends BaseStrategy {
  readonly type = AuthMethod.OTP;
  readonly name = 'otp';

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
   * Request an OTP code for the given email or phone.
   * Returns the plaintext code (in production, dispatch via email/SMS).
   */
  async requestOtp(identifier: string, digits = 6, expiresIn = 300): Promise<string> {
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    const code = randomInt(min, max).toString();

    const data = { code, attempts: 0, identifier };
    await this.cache.set(`${OTP_PREFIX}${identifier}`, data, expiresIn);

    return code;
  }

  /**
   * Authenticate using an email/phone + OTP code.
   */
  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const identifier = payload.identifier as string;
    const code = payload.code as string;

    if (!identifier || !code) {
      throw new Error('identifier and code are required');
    }

    const data = await this.cache.get<{
      code: string;
      attempts: number;
      identifier: string;
    }>(`${OTP_PREFIX}${identifier}`);

    if (!data) {
      throw new Error('OTP not found or expired');
    }

    if (data.attempts >= 3) {
      await this.cache.del(`${OTP_PREFIX}${identifier}`);
      throw new Error('Too many failed OTP attempts');
    }

    if (data.code !== code) {
      data.attempts += 1;
      await this.cache.set(`${OTP_PREFIX}${identifier}`, data, 300);
      throw new Error('Invalid OTP code');
    }

    // Code is valid — clean up
    await this.cache.del(`${OTP_PREFIX}${identifier}`);

    const isEmail = identifier.includes('@');
    let user = isEmail ? await this.userService.findByEmail(identifier) : null;

    if (!user) {
      user = await this.userService.create(isEmail ? { email: identifier } : { phone: identifier });
    }

    user.roles = await this.userService.getRoles(user.id);
    user.permissions = await this.userService.getPermissions(user.id);

    const tokens = await this.jwtService.signTokens(user);

    return { user, tokens, isNewUser: !user.email };
  }
}
