import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { IAuthUser } from '../interfaces';

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * @example
 * ```typescript
 * // Returns the full IAuthUser object
 * @Get('me')
 * getProfile(@CurrentUser() user: IAuthUser) { … }
 *
 * // Returns only the email
 * @Get('email')
 * getEmail(@CurrentUser('email') email: string) { … }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (key: keyof IAuthUser | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: IAuthUser }>();
    const user = request.user;
    if (!user) return undefined;
    return key ? user[key] : user;
  },
);
