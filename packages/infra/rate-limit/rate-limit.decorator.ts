import { SetMetadata } from '@nestjs/common';
import { METADATA_RATE_LIMIT } from './rate-limit.constants.js';
import type { RateLimitGuardOptions } from './rate-limit.types.js';

export const RateLimit = (options: RateLimitGuardOptions) =>
  SetMetadata(METADATA_RATE_LIMIT, options);
