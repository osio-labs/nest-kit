import type { Type } from '@nestjs/common';
import { getSchemaPath, ApiExtraModels, ApiOkResponse } from '@nestjs/swagger';

function applyPaginatedResponse(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  entity: Type<unknown>,
): void {
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
}

/**
 * Decorator that generates an `@ApiOkResponse` schema for paginated endpoints.
 *
 * @example
 * ```ts
 * @Get()
 * @ApiPaginatedResponse(User)
 * findAll() { ... }
 * ```
 *
 * @param entity - The entity class returned in the `data` array.
 */
export function ApiPaginatedResponse<T>(entity: Type<T>): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    applyPaginatedResponse(target, propertyKey, descriptor, entity);
  };
}

export { applyPaginatedResponse };
