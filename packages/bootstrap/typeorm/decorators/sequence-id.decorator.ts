import { BeforeInsert, PrimaryColumn, Column } from 'typeorm';
import { applySwaggerProperty, applyValidators, applyType } from './shared';
import { getDataSource } from './registry';

/**
 * Options for the {@link SequenceId} decorator.
 *
 * Instead of manually writing:
 * ```ts
 * @PrimaryColumn({ type: 'varchar', length: 20 })
 * @BeforeInsert()
 * async generateId() {
 *   if (this.id) return;
 *   const last = await repo.find({ order: { id: 'DESC' }, take: 1 });
 *   const num = last.length ? parseInt(last[0].id.slice(6)) + 1 : 10000;
 *   this.id = `ORDER_${num}`;
 * }
 * id: string;
 * ```
 *
 * You write:
 * ```ts
 * @SequenceId({ prefix: 'ORDER' })
 * id: string;
 * ```
 */
export interface SequenceIdOptions {
  /** Static prefix (e.g. `'ORDER'`, `'INV'`, `'CUST'`). */
  prefix: string;
  /** Starting number when the table is empty (default: 1). */
  startFrom?: number;
  /** Whether this column is the table's primary key (default: true). */
  primary?: boolean;
  /** Zero-pad the number to this many digits (e.g. `5` → `ORDER_00001`). */
  padding?: number;
  /** Separator between prefix and number (default: `'_'`). */
  separator?: string;
  /** Custom database column name (defaults to the property name). */
  columnName?: string;
  /**
   * Explicit table name for the `SELECT MAX(…)` query.
   *
   * When omitted the decorator resolves the table name from TypeORM
   * entity metadata (`ds.getMetadata(entity).tableName`).  Provide
   * this option when the metadata lookup is unavailable or you want
   * to be explicit about which table stores the sequence.
   */
  tableName?: string;
}

/**
 * Decorator that configures a sequential, prefixed ID column
 * (e.g. `ORDER_10001`, `INV_00042`) with auto-generation on insert.
 *
 * Instead of manually writing:
 * ```ts
 * @PrimaryColumn({ type: 'varchar', length: 20 })
 * @BeforeInsert()
 * async generateId() {
 *   if (this.id) return;
 *   const repo = getDataSource().getRepository(MyEntity);
 *   const { m } = await repo.createQueryBuilder('e')
 *     .select('MAX(...)', 'm')
 *     .getRawOne();
 *   this.id = `ORDER_${(m ?? 10000) + 1}`;
 * }
 * id: string;
 * ```
 *
 * You write:
 * ```ts
 * @SequenceId({ prefix: 'ORDER', startFrom: 10000 })
 * id: string;
 * ```
 *
 * **Requires the DataSource to be registered** — import `TypeOrmDataSourceModule`
 * from `@os.io/nest-kit/bootstrap` **after** `TypeOrmModule.forRoot()`, or call
 * `useDataSource(dataSource)` manually for bare TypeORM.
 *
 * Combines:
 * - **TypeORM**: `@PrimaryColumn` or `@Column` with `type: 'varchar'`.
 * - **Lifecycle hook**: `@BeforeInsert` queries `MAX(CAST(SUBSTRING(...) AS INTEGER))`
 *   and increments by 1. Never overwrites an already-set value.
 * - **class-validator**: `@IsString()` + `@IsDefined()`.
 * - **class-transformer**: `@Type(() => String)`.
 * - **Swagger**: `@ApiProperty({ type: String })` with auto-generated example.
 *
 * @example
 * ```ts
 * @Entity()
 * class Order {
 *   @SequenceId({ prefix: 'ORDER', startFrom: 10000 })
 *   id: string; // ORDER_10001, ORDER_10002, ...
 * }
 *
 * @Entity()
 * class Invoice {
 *   @SequenceId({ prefix: 'INV', padding: 5 })
 *   id: string; // INV_00001, INV_00002, ...
 * }
 * ```
 *
 * @param options - {@link SequenceIdOptions} to control prefix, padding, and docs.
 */
export function SequenceId(options: SequenceIdOptions): PropertyDecorator {
  return (target, propertyKey) => {
    const {
      prefix,
      startFrom = 1,
      primary = true,
      padding,
      separator = '_',
      columnName,
      tableName: explicitTable,
    } = options;

    const key = propertyKey as string;

    const maxLength = prefix.length + separator.length + (padding ?? String(startFrom).length + 10);

    const colOptions: Record<string, unknown> = { type: 'varchar', length: maxLength };
    if (columnName) {
      colOptions.name = columnName;
    }

    if (primary) {
      PrimaryColumn(colOptions)(target, propertyKey);
    } else {
      Column(colOptions)(target, propertyKey);
    }

    const hookName = `__seqId_${key}`;

    const generate = async function (this: Record<string, unknown>): Promise<void> {
      if (this[key]) return;

      try {
        const ds = getDataSource();
        const EntityClass = (target as { constructor: new () => unknown }).constructor;
        const repo = ds.getRepository(EntityClass);
        const tableName = explicitTable ?? ds.getMetadata(EntityClass).tableName;
        const offset = prefix.length + separator.length + 1;

        const safeKey = key.replace(/"/g, '""');
        const safeTable = tableName.replace(/"/g, '""');

        const rows = (await repo.query(
          `SELECT MAX(CAST(SUBSTRING("${safeTable}"."${safeKey}", ${offset}, 100) AS INTEGER)) AS m FROM "${safeTable}"`,
        )) as unknown as Array<Record<string, unknown>> | undefined;

        const maxVal: number | null = rows?.[0]?.m != null ? Number(rows[0].m) : null;
        const next = maxVal != null ? maxVal + 1 : startFrom;

        this[key] = padding
          ? `${prefix}${separator}${String(next).padStart(padding, '0')}`
          : `${prefix}${separator}${next}`;
      } catch {
        this[key] = padding
          ? `${prefix}${separator}${String(startFrom).padStart(padding, '0')}`
          : `${prefix}${separator}${startFrom}`;
      }
    };

    Object.defineProperty(target, hookName, {
      value: generate,
      writable: true,
      enumerable: false,
      configurable: true,
    });

    BeforeInsert()(target, hookName);

    applySwaggerProperty(target, propertyKey, {
      type: String,
      required: true,
      example: padding
        ? `${prefix}${separator}${String(startFrom).padStart(padding, '0')}`
        : `${prefix}${separator}${startFrom}`,
    });

    applyValidators(target, propertyKey, [{ name: 'IsString' }]);
    applyValidators(target, propertyKey, [{ name: 'IsDefined' }]);
    applyType(target, propertyKey, () => String);
  };
}
