import { Column, type ColumnOptions } from 'typeorm';
import { applySwaggerProperty, applyValidators, applyType, applyTransform } from './shared';

/**
 * Options for the {@link Url} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'varchar' })
 * @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
 * @IsUrl() @IsDefined()
 * @ApiProperty({ type: String, required: true, example: 'https://example.com', description, format: 'uri' })
 * website: string;
 * ```
 *
 * You write:
 * ```ts
 * @Url()
 * website: string;
 * ```
 */

export interface UrlOptions {
  /** Custom database column name (defaults to the property name). */
  name?: string;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

/**
 * Decorator that configures a property as a URL column with validation
 * and auto-cleaning (trim) on insert/update.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'varchar' })
 * @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
 * @IsUrl() @IsDefined()
 * @ApiProperty({ type: String, required: true, example: 'https://example.com', description, format: 'uri' })
 * website: string;
 * ```
 *
 * You write:
 * ```ts
 * @Url()
 * website: string;
 * ```
 *
 * Combines:
 * - **TypeORM**: `@Column({ type: 'varchar' })`
 * - **class-validator**: `@IsUrl()` + `@IsDefined()` / `@IsOptional()`
 * - **class-transformer**: `@Type(() => String)`
 * - **Swagger**: `@ApiProperty({ format: 'uri' })`
 *
 * @example
 * ```ts
 * @Entity()
 * class Product {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Url()
 *   website: string; // "  https://example.com  " → "https://example.com"
 * }
 * ```
 *
 * @param options - {@link UrlOptions} to customise the column.
 */
export function Url(options?: UrlOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name, required = true, description } = options ?? {};
    const colOptions: ColumnOptions = { type: 'varchar', nullable: !required };
    if (name) colOptions.name = name;
    Column(colOptions)(target, propertyKey);

    applyTransform(target, propertyKey, ({ value }) =>
      typeof value === 'string' ? value.trim() : value,
    );

    applyType(target, propertyKey, () => String);
    applyValidators(target, propertyKey, [{ name: 'IsUrl' }]);
    if (required) {
      applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    } else {
      applyValidators(target, propertyKey, [{ name: 'IsOptional' }]);
    }
    applySwaggerProperty(target, propertyKey, {
      type: String,
      required,
      example: 'https://example.com',
      description,
      format: 'uri',
    });
  };
}
