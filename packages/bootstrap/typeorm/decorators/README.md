# Smart Entity Decorators — `@os.io/nest-kit/bootstrap/typeorm/decorators`

## Entity-level decorators

Apply on the class to change entity behaviour as a whole.

| Decorator       | What it replaces                              |
| --------------- | --------------------------------------------- |
| `@SoftDelete()` | `@DeleteDateColumn()` on a property           |
| `@HalfUnique()` | Raw `CREATE UNIQUE INDEX … WHERE …` migration |

---

### `@SoftDelete`

Adds a `deletedAt` / `deleted_at` soft-delete column to any entity.

```ts
// Instead of adding a property + decorator manually:
@Entity()
class Product {
  @PrimaryGeneratedColumn() id: number;

  @DeleteDateColumn({ name: 'deleted_at' }) // ← boilerplate
  deletedAt: Date | null;
}

// Just decorate the class:
@SoftDelete()
@Entity()
class Product {
  @PrimaryGeneratedColumn() id: number;
  // deletedAt is auto-added
}
```

Works with TypeORM's built-in soft-delete — `find()`, `findOne()`, `remove()` respect it out of the box.

---

### `@HalfUnique`

Partial unique constraint — unique only when specified columns are non-null.

```ts
// Instead of writing a raw SQL migration:
// CREATE UNIQUE INDEX IF NOT EXISTS ... WHERE "email" IS NOT NULL
// …and remembering to add it to every environment.

@Entity()
@HalfUnique(['email', 'tenantId'])
class User {
  @Column({ nullable: true })
  email?: string;

  @Column()
  tenantId: string;
}
```

At the schema level this creates: `CREATE UNIQUE INDEX … ON "user" ("tenantId") WHERE "email" IS NOT NULL`.

`@HalfUnique` handles indexing & migration automatically during `synchronize` or migration generation.

---

## Field-level decorators

Apply on individual properties to replace 3–6 lines of boilerplate (TypeORM column + validator + transformer + Swagger) with a single annotation.

| Decorator       | Instead of writing                                                                           |
| --------------- | -------------------------------------------------------------------------------------------- |
| `@Money()`      | `@Column()` + transformer + `@IsNumber()` + `@ApiProperty()`                                 |
| `@Slug()`       | `@Column()` + `@Index()` + `@BeforeInsert`/`@BeforeUpdate` + `@Matches()` + `@ApiProperty()` |
| `@UniqueCode()` | `@Column({unique})` + `@BeforeInsert` + `@IsString()` + `@ApiProperty()`                     |
| `@SequenceId()` | `@PrimaryColumn()` + `@BeforeInsert` with manual DB query + validators                       |

---

### `@Money`

Monetary decimal column with exact precision. Saves 4 lines per field.

```ts
// Before:
@Column({ type: 'decimal', precision: 10, scale: 2, transformer: { to: …, from: … } })
@IsNumber() @IsDefined()
@Type(() => Number)
@ApiProperty({ type: Number, format: 'decimal(10,2)' })
price: number;

// After:
@Money()
price: number;
```

```ts
@Entity()
class Product {
  @Money() price: number;
  @Money({ required: false }) discount: number | null;
  @Money({ precision: 14, scale: 4 }) tax: number;
}
```

Combines: `@Column(type: 'decimal')` + `number ↔ string` transformer + `@IsNumber()` / `@IsDefined()` / `@IsOptional()` + `@Type(() => Number)` + `@ApiProperty({ format: 'decimal(p,s)' })`.

---

### `@Slug`

Auto-generated URL-friendly slug with zero config. Saves 6 lines per field.

```ts
// Before:
@Column({ type: 'citect' })
@Index()
@BeforeInsert()
@BeforeUpdate()
slugify() { this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
@Matches(/^[a-z0-9-]+$/)
@ApiProperty({ type: String })
slug: string;

// After:
@Slug({ from: 'name' })
slug: string;
```

```ts
@Entity()
class Product {
  @Column() name: string;
  @Slug({ from: 'name' }) slug: string; // "Hello World!" → "hello-world"
  @Slug({ from: 'title', citext: false }) path: string; // varchar, no index
}
```

Key behaviour:

- `citext` (default) for case-insensitive DB lookups without `LOWER()`
- `@Index()` auto-added
- `@BeforeInsert` + `@BeforeUpdate` auto-generate; never overwrites manual value
- Regex validation via `@Matches(/^[a-z0-9-]+$/)`

---

### `@UniqueCode`

Auto-generated unique code (SKU, order number, coupon). Saves 5 lines per field.

```ts
// Before:
@Column({ unique: true, length: 12 })
@BeforeInsert()
generateCode() {
  if (!this.sku) this.sku = 'SKU-' + randomBytes(4).toString('hex').toUpperCase();
}
@IsString() @IsDefined()
@ApiProperty({ type: String })
sku: string;

// After:
@UniqueCode({ prefix: 'SKU' })
sku: string;
```

```ts
@Entity()
class Product {
  @UniqueCode({ prefix: 'SKU' }) sku: string; // SKU-A1B2C3D4
}

@Entity()
class Coupon {
  @UniqueCode({ prefix: 'CPN', length: 6, uppercase: false })
  code: string; // CPN-a1b2c3
}
```

Behaviour:

- Generates only when the field is **empty** — manual overrides persist
- Configurable `prefix`, `length` (default 8), `uppercase` (default true), `separator` (default `-`)
- `@BeforeInsert` only, not `@BeforeUpdate`

---

### `@SequenceId`

Sequential prefixed ID (`ORDER_10001`, `ORDER_10002`, …) with auto-increment. Saves 6+ lines per entity.

```ts
// Before:
@PrimaryColumn({ type: 'varchar', length: 20 })
@BeforeInsert()
async generateId() {
  if (this.id) return;
  const repo = getDataSource().getRepository(Order);
  const { m } = await repo.query('SELECT MAX(CAST(SUBSTRING("id", 7, 100) AS INTEGER)) FROM "order"');
  this.id = `ORDER_${(m ?? 10000) + 1}`;
}
@IsString() @IsDefined()
@Type(() => String)
@ApiProperty({ type: String })
id: string;

// After:
@SequenceId({ prefix: 'ORDER', startFrom: 10000 })
id: string;
```

```ts
@Entity()
class Order {
  @SequenceId({ prefix: 'ORDER', startFrom: 10000 })
  id: string;
}

@Entity()
class Invoice {
  @SequenceId({ prefix: 'INV', padding: 5 })
  id: string; // INV_00001, INV_00002, …
}
```

**One-time setup** — import `TypeOrmDataSourceModule` **after** `TypeOrmModule.forRoot()`:

```ts
import { TypeOrmDataSourceModule } from '@os.io/nest-kit/bootstrap';

@Module({
  imports: [
    TypeOrmModule.forRoot({ … }),
    TypeOrmDataSourceModule,  // ← auto-registers DataSource for @SequenceId
  ],
})
export class AppModule {}
```

For bare TypeORM (no NestJS), register manually:

```ts
import { useDataSource } from '@os.io/nest-kit/bootstrap';

const dataSource = new DataSource({ … });
await dataSource.initialize();
useDataSource(dataSource);
```

Behaviour:

- `@BeforeInsert` runs `SELECT MAX(…)` on the table, increments by 1
- Never overwrites an already-set value
- `padding` for zero-padded numbers, `separator` for custom separator
- Works as `@PrimaryColumn` (default) or `@Column` with `primary: false`
- `tableName` — explicit table name for the query (optional; defaults to TypeORM entity metadata)

## Import

```ts
// Decorators + auto-registration module
import {
  HalfUnique,
  SoftDelete,
  Money,
  Slug,
  UniqueCode,
  SequenceId,
  TypeOrmDataSourceModule,
} from '@os.io/nest-kit/bootstrap';

// Option types (type-only):
import type {
  HalfUniqueOptions,
  MoneyOptions,
  SlugOptions,
  UniqueCodeOptions,
  SequenceIdOptions,
} from '@os.io/nest-kit/bootstrap';
```

Decorators are `undefined` when `typeorm` is not installed (safe to import).
