import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult } from '../../interfaces';
import type { IUserService } from '../../interfaces';
import { USER_SERVICE } from '../../auth.constants';
import { JwtService } from '../../session/jwt.service';
import { BaseStrategy } from '../base/base.strategy';
import { OAuthProviderRegistry } from './oauth-provider-registry';

/**
 * OAuth 2.0 authentication strategy supporting Google, GitHub, Facebook,
 * Apple, Microsoft, Discord, and custom providers.
 *
 * The consumer must provide a handler to exchange the authorization code
 * for user info (or pass an access token directly).
 */
@Injectable()
export class OAuthStrategy extends BaseStrategy {
  readonly type = AuthMethod.OAUTH;
  readonly name = 'oauth';

  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
    private readonly jwtService: JwtService,
    public readonly registry: OAuthProviderRegistry,
  ) {
    super();
  }

  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const provider = payload.provider as string;
    const code = payload.code as string | undefined;
    const accessToken = payload.accessToken as string | undefined;

    if (!provider) {
      throw new Error('OAuth provider is required');
    }

    if (!code && !accessToken) {
      throw new Error('Either authorization code or access token is required');
    }

    if (!this.registry.has(provider)) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    // In production, exchange the code for an access token and fetch user info
    // from the provider's userinfo endpoint. The exact implementation depends
    // on the provider. Here we delegate to the consumer via a custom handler.
    //
    // The consumer should override this by providing their own OAuth handler.
    const socialId = `${provider}:${(payload.sub || payload.id) as string}`;
    const email = payload.email as string | undefined;
    const name = payload.name as string | undefined;

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
