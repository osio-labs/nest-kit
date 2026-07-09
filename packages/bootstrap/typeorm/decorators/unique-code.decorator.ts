import { Column, BeforeInsert } from 'typeorm';
import { applySwaggerProperty, applyValidators, applyType } from './shared';

/**
 * Options for the {@link UniqueCode} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ unique: true, length: 12 })
 * @BeforeInsert()
 * generateSku() {
 *   if (!this.sku) this.sku = 'SKU-' + randomBytes(4).toString('hex').toUpperCase();
 * }
 * @IsString() @IsDefined()
 * @ApiProperty({ type: String })
 * sku: string;
 * ```
 *
 * You write:
 * ```ts
 * @UniqueCode({ prefix: 'SKU' })
 * sku: string; // e.g. "SKU-A1B2C3D4"
 * ```
 */
export interface UniqueCodeOptions {
  /** Static prefix before the separator (e.g. `'SKU'`, `'ORD'`, `'CPN'`). */
  prefix: string;
  /** Length of the random alphanumeric segment (default: 8). */
  length?: number;
  /** Whether the random segment uses uppercase (default: true). */
  uppercase?: boolean;
  /** Separator between prefix and random segment (default: `'-'`). */
  separator?: string;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Example value for OpenAPI / Swagger documentation. */
  example?: string;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

function generateRandomString(length: number, uppercase: boolean): string {
  const chars = uppercase
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    : 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Decorator that configures an auto-generated unique code column (SKU, order number, coupon code).
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ unique: true, length: 12 })
 * @BeforeInsert()
 * generateSku() {
 *   if (!this.sku) this.sku = 'SKU-' + randomBytes(4).toString('hex').toUpperCase();
 * }
 * @IsString() @IsDefined()
 * @ApiProperty({ type: String })
 * sku: string;
 * ```
 *
 * You write:
 * ```ts
 * @UniqueCode({ prefix: 'SKU' })
 * sku: string;
 * ```
 *
 * Combines:
 * - **TypeORM**: `@Column({ type: 'varchar', unique: true })` with automatic length calculation
 *   (`prefix.length + separator.length + random-length`).
 * - **Lifecycle hook**: `@BeforeInsert` generates the code only when the field is empty,
 *   so you can still set it manually if needed.
 * - **class-validator**: `@IsString()` + `@IsDefined()` / `@IsOptional()`.
 * - **class-transformer**: `@Type(() => String)`.
 * - **Swagger**: `@ApiProperty({ type: String })` with auto-generated example.
 *
 * @example
 * ```ts
 * @Entity()
 * class Product {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @UniqueCode({ prefix: 'SKU' })
 *   sku: string;
 * }
 * ```
 *
 * @param options - {@link UniqueCodeOptions} to control prefix, length, case, and docs.
 */
export function UniqueCode(options: UniqueCodeOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const {
      prefix,
      length = 8,
      uppercase = true,
      separator = '-',
      required = true,
      example,
      description,
    } = options;

    const maxLength = prefix.length + separator.length + length;

    Column({
      type: 'varchar',
      length: maxLength,
      unique: true,
      nullable: !required,
    })(target, propertyKey);
    const key = propertyKey as string;

    const hookName = `__uniqueCode_${key}`;

    const generate = function (this: Record<string, unknown>): void {
      if (!this[key]) {
        this[key] = prefix + separator + generateRandomString(length, uppercase);
      }
    };

    Object.defineProperty(target, hookName, {
      value: generate,
      writable: true,
      enumerable: false,
      configurable: true,
    });

    BeforeInsert()(target, hookName);

    applyType(target, propertyKey, () => String);

    applyValidators(target, propertyKey, [{ name: 'IsString' }]);

    if (required) {
      applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    } else {
      applyValidators(target, propertyKey, [{ name: 'IsOptional' }]);
    }

    applySwaggerProperty(target, propertyKey, {
      type: String,
      required,
      example: example ?? `${prefix}${separator}${generateRandomString(length, uppercase)}`,
      description,
    });
  };
}
