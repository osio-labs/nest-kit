import { SetMetadata } from '@nestjs/common';
import { METADATA_RATE_LIMIT } from './rate-limit.constants';
import type { RateLimitGuardOptions } from './rate-limit.types';

export const RateLimit = (options: RateLimitGuardOptions) =>
  SetMetadata(METADATA_RATE_LIMIT, options);
