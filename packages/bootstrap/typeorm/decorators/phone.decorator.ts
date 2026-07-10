import { Column, type ColumnOptions } from 'typeorm';
import { applySwaggerProperty, applyValidators, applyType, applyTransform } from './shared';

/**
 * Options for the {@link Phone} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'varchar', length: 20 })
 * @Transform(({ value }) => typeof value === 'string' ? value.replace(/\s+/g, '') : value)
 * @Matches(/^\+?[1-9]\d{1,14}$/) @IsDefined()
 * @ApiProperty({ type: String, required: true, example: '+84912345678', description, format: 'phone' })
 * phone: string;
 * ```
 *
 * You write:
 * ```ts
 * @Phone()
 * phone: string;
 * ```
 */

export interface PhoneOptions {
  /** Custom database column name (defaults to the property name). */
  name?: string;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

/**
 * Decorator that configures a property as a phone number column with validation
 * and auto-cleaning (strip whitespace) on insert/update.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'varchar', length: 20 })
 * @Transform(({ value }) => typeof value === 'string' ? value.replace(/\s+/g, '') : value)
 * @Matches(/^\+?[1-9]\d{1,14}$/) @IsDefined()
 * @ApiProperty({ type: String, required: true, example: '+84912345678', description, format: 'phone' })
 * phone: string;
 * ```
 *
 * You write:
 * ```ts
 * @Phone()
 * phone: string;
 * ```
 *
 * Combines:
 * - **TypeORM**: `@Column({ type: 'varchar', length: 20 })`
 * - **class-validator**: `@Matches(/^\+?[1-9]\d{1,14}$/)` (E.164) + `@IsDefined()` / `@IsOptional()`
 * - **class-transformer**: `@Type(() => String)`
 * - **Swagger**: `@ApiProperty({ format: 'phone' })`
 *
 * @example
 * ```ts
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Phone()
 *   phone: string; // "  +84 912 345 678  " → "+84912345678"
 * }
 * ```
 *
 * @param options - {@link PhoneOptions} to customise the column.
 */
export function Phone(options?: PhoneOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name, required = true, description } = options ?? {};
    const colOptions: ColumnOptions = { type: 'varchar', length: 20, nullable: !required };
    if (name) colOptions.name = name;
    Column(colOptions)(target, propertyKey);

    applyTransform(target, propertyKey, ({ value }) =>
      typeof value === 'string' ? value.replace(/\s+/g, '') : value,
    );

    applyType(target, propertyKey, () => String);
    applyValidators(target, propertyKey, [{ name: 'Matches', args: [/^\+?[1-9]\d{1,14}$/] }]);
    if (required) {
      applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    } else {
      applyValidators(target, propertyKey, [{ name: 'IsOptional' }]);
    }
    applySwaggerProperty(target, propertyKey, {
      type: String,
      required,
      example: '+84912345678',
      description,
      format: 'phone',
    });
  };
}
