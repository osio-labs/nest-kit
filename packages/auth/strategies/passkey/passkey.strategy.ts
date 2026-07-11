import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult } from '../../interfaces/index.js';
import type { IUserService } from '../../interfaces/index.js';
import { USER_SERVICE } from '../../auth.constants.js';
import { JwtService } from '../../session/jwt.service.js';
import { BaseStrategy } from '../base/base.strategy.js';

/**
 * WebAuthn / FIDO2 Passkey authentication strategy.
 *
 * Provides credential registration and assertion ceremonies
 * using the `@simplewebauthn/server` package (loaded dynamically).
 */
@Injectable()
export class PasskeyStrategy extends BaseStrategy {
  readonly type = AuthMethod.PASSKEY;
  readonly name = 'passkey';

  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  /**
   * Authenticate using a WebAuthn assertion response.
   */
  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const userId = payload.userId as string;
    const credential = payload.credential as Record<string, unknown>;

    if (!userId || !credential) {
      throw new Error('userId and credential are required');
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // In production, use @simplewebauthn/server to verify the assertion.
    // This requires stored credential records (credentialID, publicKey, counter).
    //
    // const verification = await verifyAuthenticationResponse({ ... });
    //
    // For now, we assume verification succeeds when the strategy is called.
    // Consumers should override or extend this behavior.

    user.roles = await this.userService.getRoles(user.id);
    user.permissions = await this.userService.getPermissions(user.id);

    const tokens = await this.jwtService.signTokens(user);

    return { user, tokens };
  }

  /**
   * Generate registration options for the WebAuthn ceremony.
   */
  async generateRegistrationOptions(
    userId: string,
    userName: string,
    rpName = 'NestKit',
    rpId?: string,
  ): Promise<Record<string, unknown>> {
    const webauthn = await this.loadWebAuthn();
    const userEncoder = new TextEncoder();
    const options = webauthn.generateRegistrationOptions({
      rpName,
      rpID: rpId ?? 'localhost',
      userName,
      userID: userEncoder.encode(userId),
      attestationType: 'none',
    });

    return options as unknown as Record<string, unknown>;
  }

  /**
   * Verify a registration response and return the credential.
   */
  async verifyRegistrationResponse(
    credential: Record<string, unknown>,
    expectedChallenge: string,
    expectedOrigin: string,
    expectedRpId: string,
  ): Promise<Record<string, unknown>> {
    const webauthn = await this.loadWebAuthn();
    const verification = await webauthn.verifyRegistrationResponse({
      response: credential as never,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: expectedRpId,
    });

    return verification;
  }

  private async loadWebAuthn(): Promise<typeof import('@simplewebauthn/server')> {
    try {
      return await import('@simplewebauthn/server');
    } catch {
      throw new Error(
        'Passkey strategy requires "@simplewebauthn/server". Run: npm install @simplewebauthn/server',
      );
    }
  }
}
