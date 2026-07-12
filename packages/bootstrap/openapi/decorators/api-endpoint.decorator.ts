import type { Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiSecurity,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { applyPaginatedResponse } from './api-paginated-response.decorator.js';

/**
 * Options for the {@link ApiEndpoint} decorator.
 *
 * Combines summary, tags, auth, success response, and multiple error
 * responses into a single decorator call.
 */
export interface ApiEndpointOptions {
  /** Short description for the endpoint (appears in Swagger UI). */
  summary?: string;
  /** Detailed description of the endpoint behaviour. */
  description?: string;
  /** Swagger tags to group this endpoint under. */
  tags?: string[];
  /** Whether to require Bearer token authentication. */
  bearer?: boolean;
  /** Custom security requirements, e.g. `[{ apiKey: ['read'] }]`. */
  security?: Record<string, string[]>[];

  // ── Success responses ──────────────────────────────────
  /** Entity returned on 200 OK. */
  ok?: Type<unknown>;
  /** Entity returned on 201 Created. */
  created?: Type<unknown>;
  /** Entity returned in a paginated 200 OK response. */
  paginated?: Type<unknown>;

  // ── Error responses ────────────────────────────────────
  /** 400 Bad Request. Pass a description string or `true`. */
  badRequest?: string | true;
  /** 401 Unauthorized. */
  unauthorized?: string | true;
  /** 403 Forbidden. */
  forbidden?: string | true;
  /** 404 Not Found. */
  notFound?: string | true;
  /** 409 Conflict. */
  conflict?: string | true;
  /** 422 Unprocessable Entity. */
  unprocessable?: string | true;
  /** 429 Too Many Requests. */
  tooManyRequests?: string | true;
}

function desc(val: string | true, fallback: string): string {
  return typeof val === 'string' ? val : fallback;
}

/**
 * Combined decorator that applies Swagger metadata for an endpoint.
 *
 * @example
 * ```ts
 * @Get(':id')
 * @ApiEndpoint({
 *   summary: 'Get user by ID',
 *   tags: ['Users'],
 *   bearer: true,
 *   ok: User,
 *   notFound: 'User not found',
 *   badRequest: 'Invalid ID',
 * })
 * findOne(@Param('id') id: string) { ... }
 * ```
 *
 * @param options - {@link ApiEndpointOptions} describing the endpoint.
 */
export function ApiEndpoint(options: ApiEndpointOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    if (options.summary || options.description) {
      ApiOperation({ summary: options.summary, description: options.description })(
        target,
        propertyKey,
        descriptor,
      );
    }

    if (options.tags?.length) {
      ApiTags(...options.tags)(target, propertyKey, descriptor);
    }

    if (options.bearer) {
      ApiBearerAuth()(target, propertyKey, descriptor);
    }

    if (options.security) {
      for (const sec of options.security) {
        const entries = Object.entries(sec);
        if (entries[0]) {
          ApiSecurity(entries[0][0], entries[0][1])(target, propertyKey, descriptor);
        }
      }
    }

    // ── Success responses ──
    if (options.ok) {
      ApiOkResponse({ type: options.ok })(target, propertyKey, descriptor);
    }

    if (options.created) {
      ApiCreatedResponse({ type: options.created })(target, propertyKey, descriptor);
    }

    if (options.paginated) {
      applyPaginatedResponse(target, propertyKey, descriptor, options.paginated);
    }

    // ── Error responses ──
    if (options.badRequest) {
      ApiBadRequestResponse({
        description: desc(options.badRequest, 'Bad request'),
      })(target, propertyKey, descriptor);
    }

    if (options.unauthorized) {
      ApiUnauthorizedResponse({
        description: desc(options.unauthorized, 'Unauthorized'),
      })(target, propertyKey, descriptor);
    }

    if (options.forbidden) {
      ApiForbiddenResponse({
        description: desc(options.forbidden, 'Forbidden'),
      })(target, propertyKey, descriptor);
    }

    if (options.notFound) {
      ApiNotFoundResponse({
        description: desc(options.notFound, 'Not found'),
      })(target, propertyKey, descriptor);
    }

    if (options.conflict) {
      ApiConflictResponse({
        description: desc(options.conflict, 'Conflict'),
      })(target, propertyKey, descriptor);
    }

    if (options.unprocessable) {
      ApiUnprocessableEntityResponse({
        description: desc(options.unprocessable, 'Unprocessable entity'),
      })(target, propertyKey, descriptor);
    }

    if (options.tooManyRequests) {
      ApiTooManyRequestsResponse({
        description: desc(options.tooManyRequests, 'Too many requests'),
      })(target, propertyKey, descriptor);
    }
  };
}
