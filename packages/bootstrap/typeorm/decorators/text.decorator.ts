import { Column, type ColumnOptions, type ColumnType } from 'typeorm';
import { applySwaggerProperty, applyValidators, applyType, applyTransform } from './shared';

/**
 * Available text column length variants.
 */
export type TextLength = 'tiny' | 'text' | 'medium' | 'long';

/**
 * Options for the {@link Text} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'text' })
 * @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
 * @IsString() @IsDefined()
 * @ApiProperty({ type: String, required: true, example: 'Some text content…', description })
 * body: string;
 * ```
 *
 * You write:
 * ```ts
 * @Text()
 * body: string;
 * ```
 */

export interface TextOptions {
  /** Custom database column name (defaults to the property name). */
  name?: string;
  /** Text column size variant (default: `'text'`). */
  length?: TextLength;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

const TEXT_MAP: Record<TextLength, string> = {
  tiny: 'tinytext',
  text: 'text',
  medium: 'mediumtext',
  long: 'longtext',
};

/**
 * Decorator that configures a variable-length text column with auto-trim.
 *
 * Supports `TINYTEXT`, `TEXT`, `MEDIUMTEXT`, and `LONGTEXT` variants.
 * Automatically trims whitespace on insert and update.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'text' })
 * @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
 * @IsString() @IsDefined()
 * @ApiProperty({ type: String, required: true, example: 'Some text content…', description })
 * body: string;
 * ```
 *
 * You write:
 * ```ts
 * @Text()
 * body: string;
 * ```
 *
 * Combines:
 * - **TypeORM**: `@Column({ type: 'text' })`
 * - **class-validator**: `@IsString()` + `@IsDefined()` / `@IsOptional()`
 * - **class-transformer**: `@Type(() => String)`
 * - **Swagger**: `@ApiProperty({ type: String })`
 *
 * @example
 * ```ts
 * @Entity()
 * class Article {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Text()
 *   body: string; // "  hello  " → "hello"
 *
 *   @Text({ length: 'long' })
 *   content: string;
 * }
 * ```
 *
 * @param options - {@link TextOptions} to customise the column.
 */
export function Text(options?: TextOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name, length: len = 'text', required = true, description } = options ?? {};
    const colOptions: ColumnOptions = {
      type: (TEXT_MAP[len] ?? 'text') as ColumnType,
      nullable: !required,
    };
    if (name) colOptions.name = name;
    Column(colOptions)(target, propertyKey);

    applyTransform(target, propertyKey, ({ value }) =>
      typeof value === 'string' ? value.trim() : value,
    );

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
      example: 'Some text content…',
      description,
    });
  };
}
