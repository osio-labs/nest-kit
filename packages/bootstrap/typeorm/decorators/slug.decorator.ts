import { Column, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { applySwaggerProperty, applyValidators, applyType } from './shared';

/**
 * Options for the {@link Slug} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'citext' })
 * @Index()
 * @BeforeInsert() @BeforeUpdate()
 * slugify() { this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
 * @Matches(/^[a-z0-9-]+$/)
 * @ApiProperty({ type: String })
 * slug: string;
 * ```
 *
 * You write:
 * ```ts
 * @Slug({ from: 'name' })
 * slug: string;
 * ```
 */
export interface SlugOptions {
  /** The property name to generate the slug from (e.g. `'name'`, `'title'`). */
  from: string;
  /**
   * Use PostgreSQL `citext` type for case-insensitive lookups (default: true).
   *
   * `citext` behaves like `varchar` but comparison is case-insensitive,
   * so `WHERE slug = 'hello-world'` matches `'Hello-World'`.
   * Falls back to `varchar` when set to `false`.
   */
  citext?: boolean;
  /** Whether to add a database index on the slug column (default: true). */
  index?: boolean;
  /** Whether the column is NOT NULL (default: true). */
  required?: boolean;
  /** Example value for OpenAPI / Swagger documentation. */
  example?: string;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Decorator that configures a URL-friendly slug column with automatic generation.
 *
 * Instead of manually writing:
 * ```ts
 * @Column({ type: 'citext' })
 * @Index()
 * @BeforeInsert() @BeforeUpdate()
 * slugify() { this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
 * @Matches(/^[a-z0-9-]+$/)
 * @ApiProperty({ type: String })
 * slug: string;
 * ```
 *
 * You write:
 * ```ts
 * @Slug({ from: 'name' })
 * slug: string;
 * ```
 *
 * Combines:
 * - **TypeORM column**: `citext` (case-insensitive text) or `varchar`.
 * - **Database index**: auto-added by default for fast lookups.
 * - **Lifecycle hooks**: `@BeforeInsert` + `@BeforeUpdate` auto-generate
 *   the slug from the source field (lowercased, non-alphanumeric → `-`).
 * - **class-validator**: `@Matches(/^[a-z0-9-]+$/)` + `@IsDefined()` / `@IsOptional()`.
 * - **class-transformer**: `@Type(() => String)`.
 * - **Swagger**: `@ApiProperty({ type: String })`.
 *
 * @example
 * ```ts
 * @Entity()
 * class Product {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @Column()
 *   name: string;
 *
 *   @Slug({ from: 'name' })
 *   slug: string;
 * }
 * ```
 *
 * @param options - {@link SlugOptions} to control source field, citext, index, and docs.
 */
export function Slug(options: SlugOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const {
      from,
      citext = true,
      index: withIndex = true,
      required = true,
      example,
      description,
    } = options;

    Column({ type: citext ? 'citext' : 'varchar', nullable: !required })(target, propertyKey);

    if (withIndex) {
      Index()(target, propertyKey);
    }

    const hookName = `__slug_${String(propertyKey)}`;

    const key = propertyKey as string;

    const slugify = function (this: Record<string, unknown>): void {
      const raw = this[from];
      const val = typeof raw === 'string' ? raw : '';
      this[key] = generateSlug(val);
    };

    Object.defineProperty(target, hookName, {
      value: slugify,
      writable: true,
      enumerable: false,
      configurable: true,
    });

    BeforeInsert()(target, hookName);
    BeforeUpdate()(target, hookName);

    applyType(target, propertyKey, () => String);

    applyValidators(target, propertyKey, [{ name: 'Matches', args: [/^[a-z0-9-]+$/] }]);

    if (required) {
      applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    } else {
      applyValidators(target, propertyKey, [{ name: 'IsOptional' }]);
    }

    applySwaggerProperty(target, propertyKey, {
      type: String,
      required,
      example,
      description,
    });
  };
}
