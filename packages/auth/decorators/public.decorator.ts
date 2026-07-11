import { SetMetadata } from '@nestjs/common';
import { METADATA_PUBLIC } from '../auth.constants.js';

/**
 * Mark a route handler or controller as publicly accessible
 * (bypasses the global AuthGuard).
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('login')
 * login() { … }
 * ```
 */
export const Public = () => SetMetadata(METADATA_PUBLIC, true);
