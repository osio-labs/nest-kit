/**
 * Apply `@ApiProperty()` from `@nestjs/swagger` if available.
 *
 * Gracefully no-ops when the package is not installed so that
 * entity decorators can use Swagger metadata without making it
 * a hard dependency.
 *
 * @internal
 */
export function applySwaggerProperty(
  target: object,
  propertyKey: string | symbol,
  options: Record<string, unknown>,
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ApiProperty } = require('@nestjs/swagger') as {
      ApiProperty: (opts: Record<string, unknown>) => PropertyDecorator;
    };
    ApiProperty(options)(target, propertyKey);
  } catch {
    /* @nestjs/swagger not installed */
  }
}

/**
 * Descriptor for a single class-validator decorator to apply.
 *
 * @internal
 */
interface ValidatorDef {
  /** Export name in `class-validator` (e.g. `'IsNumber'`, `'Matches'`). */
  name: string;
  /** Arguments passed to the decorator factory before invoking it. */
  args?: unknown[];
}

/**
 * Apply one or more `class-validator` decorators if available.
 *
 * Gracefully no-ops when the package is not installed.
 *
 * @internal
 */
export function applyValidators(
  target: object,
  propertyKey: string | symbol,
  validators: ValidatorDef[],
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const v = require('class-validator') as Record<
      string,
      (...args: unknown[]) => PropertyDecorator
    >;
    for (const { name, args = [] } of validators) {
      const decorator = v[name];
      if (typeof decorator === 'function') {
        decorator(...args)(target, propertyKey);
      }
    }
  } catch {
    /* class-validator not installed */
  }
}

/**
 * Apply `@Type()` from `class-transformer` if available.
 *
 * Ensures the property type is correctly handled during
 * serialisation / deserialisation round-trips.
 *
 * @internal
 */
export function applyType(
  target: object,
  propertyKey: string | symbol,
  typeFn: () => new (...args: unknown[]) => unknown,
): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Type } = require('class-transformer') as {
      Type: (fn: () => new (...args: unknown[]) => unknown) => PropertyDecorator;
    };
    Type(typeFn)(target, propertyKey);
  } catch {
    /* class-transformer not installed */
  }
}
