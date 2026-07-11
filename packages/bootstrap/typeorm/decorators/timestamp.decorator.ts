import { CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { applySwaggerProperty } from './shared.js';

/**
 * Options for the {@link CreatedAt}, {@link UpdatedAt}, and {@link DeletedAt} decorators.
 *
 * Instead of manually writing:
 * ```ts
 * @CreateDateColumn()
 * @ApiProperty({ type: Date, required: true, example: '2025-06-15T10:30:00.000Z', description, format: 'date-time' })
 * createdAt: Date;
 * ```
 *
 * You write:
 * ```ts
 * @CreatedAt()
 * createdAt: Date;
 * ```
 */

export interface TimestampOptions {
  /** Custom database column name (defaults to `created_at` / `updated_at` / `deleted_at`). */
  name?: string;
  /**
   * Override the database column type (e.g. `'timestamptz'` for PostgreSQL).
   * Defaults to the driver default (typically `timestamp` without time zone).
   */
  type?: string;
  /** Description for OpenAPI / Swagger documentation. */
  description?: string;
}

/**
 * Decorator that adds an auto-set `created_at` timestamp column.
 *
 * Uses TypeORM's `@CreateDateColumn` which automatically sets the value
 * when the row is first inserted.
 *
 * Instead of manually writing:
 * ```ts
 * @CreateDateColumn()
 * @ApiProperty({ type: Date, required: true, example: '2025-06-15T10:30:00.000Z', description, format: 'date-time' })
 * createdAt: Date;
 * ```
 *
 * You write:
 * ```ts
 * @CreatedAt()
 * createdAt: Date;
 * ```
 *
 * @example
 * ```ts
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @CreatedAt()
 *   createdAt: Date;
 *
 *   // With timezone (PostgreSQL)
 *   @CreatedAt({ type: 'timestamptz' })
 *   createdAtTz: Date;
 * }
 * ```
 *
 * @param options - {@link TimestampOptions} to customise the column.
 */
export function CreatedAt(options?: TimestampOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name = 'created_at', type, description } = options ?? {};
    const colOpts: Record<string, unknown> = { name };
    if (type) colOpts.type = type;
    CreateDateColumn(colOpts)(target, propertyKey);
    applySwaggerProperty(target, propertyKey, {
      type: Date,
      required: true,
      example: '2025-06-15T10:30:00.000Z',
      description: description ?? 'Creation timestamp',
      format: 'date-time',
    });
  };
}

/**
 * Decorator that adds an auto-updating `updated_at` timestamp column.
 *
 * Uses TypeORM's `@UpdateDateColumn` which automatically sets the value
 * when the row is inserted and updated.
 *
 * Instead of manually writing:
 * ```ts
 * @UpdateDateColumn()
 * @ApiProperty({ type: Date, required: true, example: '2025-06-15T10:30:00.000Z', description, format: 'date-time' })
 * updatedAt: Date;
 * ```
 *
 * You write:
 * ```ts
 * @UpdatedAt()
 * updatedAt: Date;
 * ```
 *
 * @example
 * ```ts
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @UpdatedAt()
 *   updatedAt: Date;
 * }
 * ```
 *
 * @param options - {@link TimestampOptions} to customise the column.
 */
export function UpdatedAt(options?: TimestampOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name = 'updated_at', type, description } = options ?? {};
    const colOpts: Record<string, unknown> = { name };
    if (type) colOpts.type = type;
    UpdateDateColumn(colOpts)(target, propertyKey);
    applySwaggerProperty(target, propertyKey, {
      type: Date,
      required: true,
      example: '2025-06-15T10:30:00.000Z',
      description: description ?? 'Last update timestamp',
      format: 'date-time',
    });
  };
}

/**
 * Decorator that adds a nullable `deleted_at` timestamp column for soft deletes.
 *
 * Uses TypeORM's `@DeleteDateColumn` which automatically sets the value
 * when the row is soft-deleted via `Repository.softDelete()` / `QueryBuilder.softDelete()`.
 *
 * Instead of manually writing:
 * ```ts
 * @DeleteDateColumn()
 * @ApiProperty({ type: Date, required: false, example: null, description, format: 'date-time' })
 * deletedAt: Date | null;
 * ```
 *
 * You write:
 * ```ts
 * @DeletedAt()
 * deletedAt: Date | null;
 * ```
 *
 * @example
 * ```ts
 * @Entity()
 * class User {
 *   @PrimaryGeneratedColumn()
 *   id: number;
 *
 *   @DeletedAt()
 *   deletedAt: Date | null;
 * }
 * ```
 *
 * @param options - {@link TimestampOptions} to customise the column.
 */
export function DeletedAt(options?: TimestampOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const { name = 'deleted_at', type, description } = options ?? {};
    const colOpts: Record<string, unknown> = { name, nullable: true };
    if (type) colOpts.type = type;
    DeleteDateColumn(colOpts)(target, propertyKey);
    applySwaggerProperty(target, propertyKey, {
      type: Date,
      required: false,
      example: null,
      description: description ?? 'Soft-delete timestamp',
      format: 'date-time',
    });
  };
}
