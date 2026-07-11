import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult } from '../../interfaces/index.js';
import type { IUserService } from '../../interfaces/index.js';
import { USER_SERVICE } from '../../auth.constants.js';
import { JwtService } from '../../session/jwt.service.js';
import { BaseStrategy } from '../base/base.strategy.js';

/**
 * Google & Apple OneTap sign-in strategy.
 *
 * OneTap provides a streamlined sign-in experience where users
 * authenticate with a single tap using their Google or Apple ID.
 */
@Injectable()
export class OneTapStrategy extends BaseStrategy {
  readonly type = AuthMethod.ONETAP;
  readonly name = 'onetap';

  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  /**
   * Authenticate using a OneTap credential token.
   * Expects `provider` ('google' | 'apple') and `credential` (ID token).
   */
  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const provider = payload.provider as string;
    const credential = payload.credential as string;

    if (!provider || !credential) {
      throw new Error('provider and credential are required');
    }

    if (!['google', 'apple'].includes(provider)) {
      throw new Error(`Unsupported OneTap provider: ${provider}`);
    }

    // In production, verify the credential (ID token) using the provider's
    // public keys (JWKS). Extract email, name, sub from the decoded token.
    //
    // For Google: use google-auth-library or manually verify the JWT
    // For Apple: fetch Apple's public keys and verify the JWT
    //
    // const payload = await verifyGoogleIdToken(credential, clientId);

    const sub = payload.sub as string;
    const email = payload.email as string | undefined;
    const name = payload.name as string | undefined;

    const socialId = `${provider}:${sub}`;
    let user = await this.userService.findBySocialId(provider, socialId);

    if (!user) {
      user = await this.userService.create({
        email,
        username: name,
      });
    }

    user.roles = await this.userService.getRoles(user.id);
    user.permissions = await this.userService.getPermissions(user.id);

    const tokens = await this.jwtService.signTokens(user);

    return { user, tokens, isNewUser: !user.email };
  }
}
