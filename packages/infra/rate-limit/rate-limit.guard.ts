/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitService } from './rate-limit.service.js';
import {
  METADATA_RATE_LIMIT,
  DEFAULT_LIMIT,
  DEFAULT_WINDOW_SECONDS,
} from './rate-limit.constants.js';
import type { RateLimitGuardOptions } from './rate-limit.types.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitGuardOptions | undefined>(
      METADATA_RATE_LIMIT,
      [context.getHandler(), context.getClass()],
    );

    const limit = options?.limit ?? DEFAULT_LIMIT;
    const windowSeconds = options?.windowSeconds ?? DEFAULT_WINDOW_SECONDS;
    const key = options?.keyGenerator ? options.keyGenerator(context) : this.defaultKey(context);
    const errorMessage = options?.errorMessage ?? 'Too many requests';

    const result = await this.rateLimitService.consume(key, limit, windowSeconds);

    const response = context.switchToHttp().getResponse();
    if (typeof response?.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', result.total);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Reset', result.resetTime);
    }

    if (!result.allowed) {
      if (typeof response?.setHeader === 'function') {
        response.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
      }
      throw new HttpException(errorMessage, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private defaultKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    return request.ip ?? request.connection?.remoteAddress ?? 'global';
  }
}
