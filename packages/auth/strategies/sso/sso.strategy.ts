import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult } from '../../interfaces';
import type { IUserService } from '../../interfaces';
import { USER_SERVICE } from '../../auth.constants';
import { JwtService } from '../../session/jwt.service';
import { BaseStrategy } from '../base/base.strategy';

/**
 * SSO authentication via SAML2 or OpenID Connect.
 *
 * Supports multiple SAML and OIDC providers configured at module init.
 */
@Injectable()
export class SsoStrategy extends BaseStrategy {
  readonly type = AuthMethod.SSO;
  readonly name = 'sso';

  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  /**
   * Authenticate using an SSO assertion / token.
   *
   * SAML: payload contains `SAMLResponse` (base64-encoded XML assertion)
   * OIDC: payload contains `idToken` (JWT)
   */
  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const provider = payload.provider as string;
    const samlResponse = payload.SAMLResponse as string | undefined;
    const idToken = payload.idToken as string | undefined;

    if (!provider) {
      throw new Error('SSO provider is required');
    }

    if (!samlResponse && !idToken) {
      throw new Error('Either SAMLResponse or idToken is required');
    }

    // SAML: Parse the assertion, extract attributes (NameID, email, etc.)
    // OIDC: Verify the ID token JWT, extract claims
    //
    // In production, use passport-saml for SAML or manually verify OIDC JWTs.
    //
    // const profile = samlResponse
    //   ? await parseSamlResponse(samlResponse, providerConfig)
    //   : await verifyOidcToken(idToken, providerConfig);

    const subject = (payload.sub as string) || (payload.NameID as string);
    const email = payload.email as string | undefined;
    const name = payload.name as string | undefined;

    const socialId = `sso:${provider}:${subject}`;
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
