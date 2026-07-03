/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { IApiKeyStore, ApiKeyOptions } from './api-key.types';
import { API_KEY_STORE, METADATA_API_KEY_PROTECTED } from './api-key.constants';

/**
 * Guard that authenticates requests using an API key.
 *
 * Extracts the API key from the configured header (default `X-API-Key`),
 * validates it via `IApiKeyStore`, and attaches the resolved client info
 * to `request.user`.
 *
 * Apply it to controllers or routes with `@UseGuards(ApiKeyGuard)`.
 * Optionally combine with `@ApiKeyProtected()` for route-level metadata.
 *
 * @example
 * ```typescript
 * import { Controller, UseGuards } from '@nestjs/common';
 * import { ApiKeyGuard } from '@os.io/nest-kit/auth';
 *
 * @UseGuards(ApiKeyGuard)
 * @Controller('/api/v3')
 * export class ThirdPartyController {}
 * ```
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(API_KEY_STORE)
    private readonly apiKeyStore: IApiKeyStore,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.getOptions(context);
    const request = context.switchToHttp().getRequest();
    const key = this.extractKey(request, options);

    if (!key) {
      throw new UnauthorizedException('Missing API key');
    }

    const apiKey = await this.apiKeyStore.validate(key);

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!apiKey.isActive) {
      throw new UnauthorizedException('API key is inactive');
    }

    if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
      throw new UnauthorizedException('API key has expired');
    }

    request.user = {
      id: apiKey.clientId,
      email: undefined,
      username: apiKey.clientName,
      roles: apiKey.roles ?? [],
      permissions: apiKey.permissions ?? [],
      isAnonymous: false,
      isMfaVerified: false,
    };

    if (options.attachApiKey !== false) {
      request.apiKey = apiKey;
    }

    return true;
  }

  private getOptions(context: ExecutionContext): ApiKeyOptions {
    const metadata = this.reflector.getAllAndOverride<ApiKeyOptions | true>(
      METADATA_API_KEY_PROTECTED,
      [context.getHandler(), context.getClass()],
    );
    if (metadata === true) return {};
    return metadata ?? {};
  }

  private extractKey(
    request: { headers: Record<string, string>; query?: Record<string, string> },
    options: ApiKeyOptions,
  ): string | undefined {
    const headerName = options.headerName ?? 'X-API-Key';
    const header = request.headers[headerName.toLowerCase()] ?? request.headers[headerName];
    if (header) return header;

    if (options.queryParam) {
      const query = request.query?.[options.queryParam];
      if (query) return query;
    }

    return undefined;
  }
}
