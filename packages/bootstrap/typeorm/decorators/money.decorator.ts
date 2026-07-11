import { Column, type ColumnOptions } from 'typeorm';
import { applySwaggerProperty, applyValidators, applyType } from './shared.js';

/**
 * Options for the {@link Money} decorator.
 *
 * Instead of writing all of this by hand:
 * ```ts
 * @Column({ type: 'decimal', precision: 10, scale: 2, transformer: {...} })
 * @IsNumber() @IsDefined()
 * @ApiProperty({ type: Number, format: 'decimal(10,2)' })
 * price: number;
 * ```
 *
 * You write one line:
 * ```ts
 * @Money()
 * price: number;
 * ```
 *
 * @example
 * ```ts
 * // Optional custom naming
 * @Money({ name: 'wholesale_price' })
 * wholesalePrice: number;
 * ```
 */
export interface MoneyOptions {
  /** Total number of digits (default: 10). */
  precision?: number;
  /** Number of digits after the decimal point (default: 2). */
  scale?: number;
  /** Custom database column name (defaults to the property name). */
  name?: string;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Example value for OpenAPI / Swagger documentation. */
  example?: number;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

const DECIMAL_TRANSFORMER = {
  to: (value: number | null | undefined): string | null | undefined => {
    if (value == null) return value;
    return value.toString();
  },
  from: (value: string | null | undefined): number | null | undefined => {
    if (value == null) return value;
    return parseFloat(value);
  },
};

/**
 * Decorator that configures a property as a monetary decimal column.
 *
 * Replaces 4–6 lines of boilerplate with one annotation:
 *
 * ```ts
 * // Instead of:
 * @Column({ type: 'decimal', precision: 10, scale: 2, transformer: {...} })
 * @IsNumber() @IsDefined()
 * @ApiProperty({ type: Number, format: 'decimal(10,2)' })
 * price: number;
 *
 * // Write:
 * @Money()
 * price: number;
 * ```
 *
 * Combines:
 * - **TypeORM**: `@Column({ type: 'decimal', precision, scale, transformer })`
 *   — stores monetary values with exact decimal precision, avoids floating-point drift.
 * - **Transformer**: Converts `number ↔ string` so the DB stores an exact string
 *   representation (PostgreSQL `numeric`, MySQL `decimal`, SQLite `text`).
 * - **class-transformer**: `@Type(() => Number)` for serialization round-trips.
 * - **class-validator**: `@IsNumber()` + `@IsDefined()` / `@IsOptional()`.
 * - **Swagger**: `@ApiProperty({ type: Number, format: 'decimal(p,s)' })`.
 *
 * @example
 * ```ts
 * @Entity()
 * class Product {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Money()
 *   price: number;
 *
 *   @Money({ required: false })
 *   discount: number | null;
 * }
 * ```
 *
 * @param options - {@link MoneyOptions} to customise precision, scale, nullability, and docs.
 */
export function Money(options?: MoneyOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const {
      precision = 10,
      scale = 2,
      name,
      required = true,
      example,
      description,
    } = options ?? {};

    const colOptions: ColumnOptions = {
      type: 'decimal',
      precision,
      scale,
      nullable: !required,
      transformer: DECIMAL_TRANSFORMER,
    };

    if (name) {
      colOptions.name = name;
    }

    Column(colOptions)(target, propertyKey);

    applyType(target, propertyKey, () => Number);

    applyValidators(target, propertyKey, [{ name: 'IsNumber' }]);

    if (required) {
      applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    } else {
      applyValidators(target, propertyKey, [{ name: 'IsOptional' }]);
    }

    const swaggerOpts: Record<string, unknown> = {
      type: Number,
      required,
      example,
      description,
      format: `decimal(${precision},${scale})`,
    };

    applySwaggerProperty(target, propertyKey, swaggerOpts);
  };
}
