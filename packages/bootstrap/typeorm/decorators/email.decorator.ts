import { Column, type ColumnOptions } from 'typeorm';
import { applySwaggerProperty, applyValidators, applyType, applyTransform } from './shared.js';

/**
 * Options for the {@link Email} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'varchar' })
 * @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
 * @IsEmail() @IsDefined()
 * @ApiProperty({ type: String, required: true, example: 'user@example.com', description, format: 'email' })
 * email: string;
 * ```
 *
 * You write:
 * ```ts
 * @Email()
 * email: string;
 * ```
 */

export interface EmailOptions {
  /** Custom database column name (defaults to the property name). */
  name?: string;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

/**
 * Decorator that configures a property as an email column with validation
 * and auto-cleaning (trim + lowercase) on insert/update.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'varchar' })
 * @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
 * @IsEmail() @IsDefined()
 * @ApiProperty({ type: String, required: true, example: 'user@example.com', description, format: 'email' })
 * email: string;
 * ```
 *
 * You write:
 * ```ts
 * @Email()
 * email: string;
 * ```
 *
 * Combines:
 * - **TypeORM**: `@Column({ type: 'varchar' })`
 * - **class-validator**: `@IsEmail()` + `@IsDefined()` / `@IsOptional()`
 * - **class-transformer**: `@Type(() => String)`
 * - **Swagger**: `@ApiProperty({ format: 'email' })`
 *
 * @example
 * ```ts
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Email()
 *   email: string; // "  USER@Example.COM  " → "user@example.com"
 * }
 * ```
 *
 * @param options - {@link EmailOptions} to customise the column.
 */
export function Email(options?: EmailOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name, required = true, description } = options ?? {};
    const colOptions: ColumnOptions = { type: 'varchar', nullable: !required };
    if (name) colOptions.name = name;
    Column(colOptions)(target, propertyKey);

    applyTransform(target, propertyKey, ({ value }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    );

    applyType(target, propertyKey, () => String);
    applyValidators(target, propertyKey, [{ name: 'IsEmail' }]);
    if (required) {
      applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    } else {
      applyValidators(target, propertyKey, [{ name: 'IsOptional' }]);
    }
    applySwaggerProperty(target, propertyKey, {
      type: String,
      required,
      example: 'user@example.com',
      description,
      format: 'email',
    });
  };
}
