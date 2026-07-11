import { Column, type ColumnOptions } from 'typeorm';
import { applySwaggerProperty, applyValidators } from './shared.js';

/**
 * Options for the {@link Boolean} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'boolean', default: false })
 * @IsDefined()
 * @ApiProperty({ type: Boolean, required: true, example: true, description })
 * isActive: boolean;
 * ```
 *
 * You write:
 * ```ts
 * @Boolean({ default: false })
 * isActive: boolean;
 * ```
 */

export interface BooleanOptions {
  /** Custom database column name (defaults to the property name). */
  name?: string;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Default value for the column. */
  default?: boolean;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

/**
 * Decorator that configures a boolean column.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'boolean' })
 * @IsDefined()
 * @ApiProperty({ type: Boolean, required: true, example: true, description })
 * isActive: boolean;
 * ```
 *
 * You write:
 * ```ts
 * @Boolean()
 * isActive: boolean;
 * ```
 *
 * Combines:
 * - **TypeORM**: `@Column({ type: 'boolean' })` with optional default
 * - **class-validator**: `@IsDefined()` / `@IsOptional()`
 * - **Swagger**: `@ApiProperty({ type: Boolean })`
 *
 * @example
 * ```ts
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Boolean({ default: false })
 *   isActive: boolean;
 *
 *   @Boolean({ required: false })
 *   isVerified?: boolean;
 * }
 * ```
 *
 * @param options - {@link BooleanOptions} to customise the column.
 */
export function Boolean(options?: BooleanOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name, required = true, default: defaultValue, description } = options ?? {};
    const colOptions: ColumnOptions = {
      type: 'boolean',
      nullable: !required,
    };
    if (name) colOptions.name = name;
    if (defaultValue !== undefined) colOptions.default = defaultValue;
    Column(colOptions)(target, propertyKey);
    if (required) {
      applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    } else {
      applyValidators(target, propertyKey, [{ name: 'IsOptional' }]);
    }
    applySwaggerProperty(target, propertyKey, {
      type: Boolean,
      required,
      example: true,
      description,
    });
  };
}
