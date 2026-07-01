import { Inject, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult } from '../../interfaces';
import type { IUserService } from '../../interfaces';
import { USER_SERVICE } from '../../auth.constants';
import { PasswordService } from '../../password/password.service';
import { JwtService } from '../../session/jwt.service';
import { BaseStrategy } from '../base/base.strategy';

/**
 * Authenticates users via email/username + password.
 *
 * Enabled by default when `AuthModuleOptions.credentials` is `true`
 * (or an object).
 */
@Injectable()
export class CredentialsStrategy extends BaseStrategy {
  readonly type = AuthMethod.CREDENTIALS;
  readonly name = 'credentials';

  constructor(
    @Inject(USER_SERVICE)
    private readonly userService: IUserService,
    _passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    const email = payload.email as string | undefined;
    const username = payload.username as string | undefined;
    const password = payload.password as string;

    if (!password) {
      throw new Error('Password is required');
    }

    const user = email
      ? await this.userService.findByEmail(email)
      : username
        ? await this.userService.findByUsername(username)
        : null;

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const valid = await this.userService.validatePassword(user, password);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    user.roles = await this.userService.getRoles(user.id);
    user.permissions = await this.userService.getPermissions(user.id);

    const tokens = await this.jwtService.signTokens(user);

    return { user, tokens };
  }
}
