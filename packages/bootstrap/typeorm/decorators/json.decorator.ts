import { Column, type ColumnOptions } from 'typeorm';
import { applySwaggerProperty, applyValidators } from './shared';

/**
 * Options for the {@link Json} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'jsonb', transformer: { to: JSON.stringify, from: JSON.parse } })
 * @IsDefined()
 * @ApiProperty({ type: Object, required: true, example: { key: 'value' }, description })
 * metadata: Record<string, unknown>;
 * ```
 *
 * You write:
 * ```ts
 * @Json()
 * metadata: Record<string, unknown>;
 * ```
 */

export interface JsonOptions {
  /** Custom database column name (defaults to the property name). */
  name?: string;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Whether to use JSONB (PostgreSQL) instead of JSON (default: true). */
  binary?: boolean;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

const JSON_TRANSFORMER = {
  to: (value: unknown): string | null => (value != null ? JSON.stringify(value) : null),
  from: (value: string | null): unknown => (value != null ? JSON.parse(value) : null),
};

/**
 * Decorator that configures a JSON / JSONB column with automatic
 * serialisation / deserialisation.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'jsonb', transformer: { to: JSON.stringify, from: JSON.parse } })
 * @IsDefined()
 * @ApiProperty({ type: Object, required: true, example: { key: 'value' }, description })
 * metadata: Record<string, unknown>;
 * ```
 *
 * You write:
 * ```ts
 * @Json()
 * metadata: Record<string, unknown>;
 * ```
 *
 * Combines:
 * - **TypeORM**: `@Column({ type: 'jsonb' | 'json', transformer })` — stores JS
 *   objects as JSON strings, parses them back on read.
 * - **class-validator**: `@IsDefined()` / `@IsOptional()`
 * - **Swagger**: `@ApiProperty({ type: Object })`
 *
 * @example
 * ```ts
 * @Entity()
 * class Product {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Json()
 *   metadata: Record<string, unknown>;
 *
 *   @Json({ binary: false })   // plain JSON, not JSONB
 *   attributes: Record<string, unknown>;
 * }
 * ```
 *
 * @param options - {@link JsonOptions} to customise the column.
 */
export function Json(options?: JsonOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name, required = true, binary = true, description } = options ?? {};
    const colOptions: ColumnOptions = {
      type: binary ? 'jsonb' : 'json',
      nullable: !required,
      transformer: JSON_TRANSFORMER,
    };
    if (name) colOptions.name = name;
    Column(colOptions)(target, propertyKey);
    if (required) {
      applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    } else {
      applyValidators(target, propertyKey, [{ name: 'IsOptional' }]);
    }
    applySwaggerProperty(target, propertyKey, {
      type: Object,
      required,
      example: { key: 'value' },
      description,
    });
  };
}
