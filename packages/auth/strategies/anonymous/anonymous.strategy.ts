import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthMethod, type IAuthResult } from '../../interfaces';
import { JwtService } from '../../session/jwt.service';
import { BaseStrategy } from '../base/base.strategy';

/**
 * Anonymous session strategy.
 *
 * Creates a temporary identity without requiring credentials.
 * These sessions can later be converted to permanent accounts.
 */
@Injectable()
export class AnonymousStrategy extends BaseStrategy {
  readonly type = AuthMethod.ANONYMOUS;
  readonly name = 'anonymous';

  private counter = 0;

  constructor(private readonly jwtService: JwtService) {
    super();
  }

  override async authenticate(
    payload: Record<string, unknown>,
    _context?: ExecutionContext,
  ): Promise<IAuthResult> {
    this.counter += 1;
    const idPrefix = (payload.idPrefix as string) || 'anon_';
    const id = `${idPrefix}${Date.now()}_${this.counter}_${Math.random().toString(36).slice(2, 8)}`;

    const user = {
      id,
      username: `Anonymous_${id.slice(-8)}`,
      isAnonymous: true,
      roles: [] as string[],
      permissions: [] as string[],
    };

    const tokens = await this.jwtService.signTokens(user);

    return { user, tokens, isNewUser: true };
  }
}
