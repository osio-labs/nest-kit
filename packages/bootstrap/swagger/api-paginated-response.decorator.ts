import type { Type } from '@nestjs/common';

function applyPaginatedResponse(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  entity: Type<unknown>,
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSchemaPath, ApiExtraModels, ApiOkResponse } = require('@nestjs/swagger') as {
      getSchemaPath: (model: Type<unknown>) => string;
      ApiExtraModels: (...models: Type<unknown>[]) => MethodDecorator;
      ApiOkResponse: (options: Record<string, unknown>) => MethodDecorator;
    };

    ApiExtraModels(entity)(target, propertyKey, descriptor);

    ApiOkResponse({
      schema: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(entity) },
          },
          total: { type: 'number' },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
        required: ['data', 'total', 'page', 'limit'],
      },
    })(target, propertyKey, descriptor);
  } catch {
    /* @nestjs/swagger not installed */
  }
}

/**
 * Decorator that generates an `@ApiOkResponse` schema for paginated endpoints.
 *
 * Instead of manually writing the full paginated response schema:
 *
 * ```ts
 * @Get()
 * @ApiOkResponse({
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       data: { type: 'array', items: { $ref: getSchemaPath(User) } },
 *       total: { type: 'number' },
 *       page: { type: 'number' },
 *       limit: { type: 'number' },
 *     },
 *   },
 * })
 * findAll() { ... }
 * ```
 *
 * You write:
 *
 * ```ts
 * @Get()
 * @ApiPaginatedResponse(User)
 * findAll() { ... }
 * ```
 *
 * Gracefully no-ops when `@nestjs/swagger` is not installed.
 *
 * @param entity - The entity class returned in the `data` array.
 */
export function ApiPaginatedResponse<T>(entity: Type<T>): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    applyPaginatedResponse(target, propertyKey, descriptor, entity);
  };
}

export { applyPaginatedResponse };
