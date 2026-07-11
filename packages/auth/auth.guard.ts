import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { METADATA_PUBLIC } from './auth.constants.js';

/**
 * Global authentication guard.
 *
 * Extracts the JWT from the `Authorization: Bearer <token>` header,
 * validates it via `AuthService.validateToken()`, and attaches the
 * decoded user to `request.user`.
 *
 * Skip authentication on routes or controllers decorated with `@Public()`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(METADATA_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      user?: import('./interfaces/index.js').IAuthUser;
      accessToken?: string;
      headers: Record<string, string>;
      cookies?: Record<string, string>;
      query?: Record<string, string>;
    }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = await this.authService.validateToken(token);
      request.user = {
        id: payload.sub as string,
        email: payload.email as string | undefined,
        username: payload.username as string | undefined,
        roles: (payload.roles as string[]) ?? [],
        permissions: (payload.permissions as string[]) ?? [],
        isAnonymous: (payload.isAnonymous as boolean) ?? false,
        isMfaVerified: (payload.isMfaVerified as boolean) ?? false,
      };
      request.accessToken = token;
    } catch (error) {
      throw new UnauthorizedException(error instanceof Error ? error.message : 'Invalid token');
    }

    return true;
  }

  private extractToken(request: {
    headers: Record<string, string>;
    cookies?: Record<string, string>;
    query?: Record<string, string>;
  }): string | undefined {
    // Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Cookie fallback
    const cookie = request.cookies?.['access_token'];
    if (cookie) return cookie;

    // Query param fallback (for WebSocket / SSE)
    const query = request.query?.['token'];
    if (query) return query;

    return undefined;
  }
}
