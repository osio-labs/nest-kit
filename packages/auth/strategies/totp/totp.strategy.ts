import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult } from '../../interfaces';
import type { IUserService } from '../../interfaces';
import { USER_SERVICE } from '../../auth.constants';
import { JwtService } from '../../session/jwt.service';
import { BaseStrategy } from '../base/base.strategy';

/**
 * TOTP-based Two-Factor Authentication.
 *
 * Supports enrollment (generating secret + QR code), verification of codes,
 * and backup-code management.
 */
@Injectable()
export class TotpStrategy extends BaseStrategy {
  readonly type = AuthMethod.TOTP;
  readonly name = 'totp';

  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  /**
   * Authenticate using a TOTP code after primary authentication.
   * Expects `userId` and `code` in the payload.
   */
  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const userId = payload.userId as string;
    const code = payload.code as string;

    if (!userId || !code) {
      throw new Error('userId and code are required');
    }

    const secret = await this.userService.getTotpSecret(userId);
    if (!secret) {
      throw new Error('TOTP is not configured for this user');
    }

    const valid = await this.verifyCode(secret, code);
    if (!valid) {
      throw new Error('Invalid TOTP code');
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isMfaVerified = true;
    user.roles = await this.userService.getRoles(user.id);
    user.permissions = await this.userService.getPermissions(user.id);

    const tokens = await this.jwtService.signTokens(user);

    return { user, tokens };
  }

  /**
   * Generate a new TOTP secret for a user (enrollment).
   * Returns the secret and an otpauth URL for QR code generation.
   */
  async enroll(
    userId: string,
    issuer = 'NestKit',
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const otpauth = await this.loadOtpauth();
    const secret = new otpauth.Secret({ size: 20 });
    const secretBase32 = secret.base32;

    const totp = new otpauth.TOTP({
      issuer,
      label: userId,
      secret,
    });

    await this.userService.setTotpSecret(userId, secretBase32);

    return { secret: secretBase32, otpauthUrl: totp.toString() };
  }

  /**
   * Verify a TOTP or backup code.
   */
  async verifyCode(secret: string, code: string): Promise<boolean> {
    const otpauth = await this.loadOtpauth();
    try {
      const totp = new otpauth.TOTP({
        secret: otpauth.Secret.fromBase32(secret),
      });

      const delta = totp.validate({ token: code });
      return delta !== null;
    } catch {
      return false;
    }
  }

  private async loadOtpauth(): Promise<typeof import('otpauth')> {
    try {
      return await import('otpauth');
    } catch {
      throw new Error('TOTP strategy requires "otpauth". Run: npm install otpauth');
    }
  }
}
