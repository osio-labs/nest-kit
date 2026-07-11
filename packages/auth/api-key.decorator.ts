import { SetMetadata } from '@nestjs/common';
import { METADATA_API_KEY_PROTECTED } from './api-key.constants.js';
import type { ApiKeyOptions } from './api-key.types.js';

/**
 * Mark a route or controller as API-key-protected.
 *
 * When applied, the `ApiKeyGuard` will validate the request using
 * the API key extracted from the configured header (default `X-API-Key`).
 *
 * @example
 * ```typescript
 * @ApiKeyProtected()
 * @Controller('/api/v3')
 * export class ThirdPartyController {}
 * ```
 */
export const ApiKeyProtected = (options?: ApiKeyOptions) =>
  SetMetadata(METADATA_API_KEY_PROTECTED, options ?? true);
