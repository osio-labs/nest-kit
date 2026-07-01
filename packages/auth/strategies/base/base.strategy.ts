import type { ExecutionContext } from '@nestjs/common';
import type { IAuthStrategy, IAuthResult, AuthMethod } from '../../interfaces';

/**
 * Abstract base strategy providing a common type and name for all strategies.
 */
export abstract class BaseStrategy implements IAuthStrategy {
  abstract readonly type: AuthMethod;
  abstract readonly name: string;

  abstract authenticate(
    payload: Record<string, unknown>,
    context?: ExecutionContext,
  ): Promise<IAuthResult>;
}
