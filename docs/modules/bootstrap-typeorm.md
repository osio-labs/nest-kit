# Bootstrap / TypeORM

> TypeORM connection setup, CRUD factories, and Unit of Work — all in one module.

---

```
typeorm/
├── config/           — configTypeOrm / configTypeOrmAsync
├── crud/             — createCrudService / createCrudController
└── uow/              — UnitOfWork / @Transactional / @TransactionalController
```

- [config/](#config) — `configTypeOrm` / `configTypeOrmAsync`
- [crud/](#crud) — `createCrudService` / `createCrudController`
- [uow/](#unit-of-work)
  - [Unit of Work](#unit-of-work) — `UnitOfWork` / `createUnitOfWork` / `withUnitOfWork`
  - [Transactional Decorator](#transactional-decorator) — `@Transactional()` / `getCurrentUnitOfWork()`

---

## Config

Two functions to build `TypeOrmModuleOptions` from environment variables or `ConfigService`.

### Usage

#### Static config (`TypeOrmModule.forRoot`)

```ts
import { configTypeOrm } from '@os.io/nest-kit/bootstrap/typeorm';

@Module({
  imports: [TypeOrmModule.forRoot(configTypeOrm())],
})
export class AppModule {}
```

#### Async config (`TypeOrmModule.forRootAsync`)

```ts
import { configTypeOrmAsync } from '@os.io/nest-kit/bootstrap/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs) => configTypeOrmAsync(cs),
    }),
  ],
})
export class AppModule {}
```

### Environment Variables

| Variable                     | Default           | Description                                                      |
| ---------------------------- | ----------------- | ---------------------------------------------------------------- |
| `DB_TYPE`                    | `postgres`        | Database type (`postgres`, `mysql`, `mariadb`, `better-sqlite3`) |
| `DB_HOST`                    | `localhost`       | Database host                                                    |
| `DB_PORT`                    | _(type-specific)_ | Database port                                                    |
| `DB_USERNAME`                | —                 | Database username                                                |
| `DB_PASSWORD`                | —                 | Database password                                                |
| `DB_DATABASE`                | _(type-specific)_ | Database name                                                    |
| `DB_SYNCHRONIZE`             | `false`           | Auto-sync schema                                                 |
| `DB_LOGGING`                 | `false`           | Enable query logging                                             |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false`           | Enable SSL with `rejectUnauthorized`                             |
| `DB_RDS_ENABLED`             | `false`           | Enable RDS mode (forces SSL + pool config)                       |
| `RDS_USE_IAM`                | `false`           | Enable IAM database auth (requires `DB_RDS_ENABLED`)             |
| `RDS_REGION`                 | `us-east-1`       | AWS region for IAM auth                                          |

### Options (`TypeOrmConfigOptions`)

| Option                | Type     | Default            | Description                                                     |
| --------------------- | -------- | ------------------ | --------------------------------------------------------------- |
| `schema`              | `string` | —                  | Database schema (Postgres); moves to `extra.schema` in RDS mode |
| `poolSize`            | `number` | `20` (RDS only)    | Connection pool size                                            |
| `idleTimeoutMs`       | `number` | `30000` (RDS only) | Idle timeout                                                    |
| `connectionTimeoutMs` | `number` | `10000` (RDS only) | Connection timeout                                              |
| `statementTimeoutMs`  | `number` | —                  | Statement timeout (Postgres, RDS only)                          |

### Type-specific defaults

| `DB_TYPE`        | Default port | Default database |
| ---------------- | ------------ | ---------------- |
| `postgres`       | 5432         | `postgres`       |
| `mysql`          | 3306         | `mysql`          |
| `mariadb`        | 3306         | `mysql`          |
| `better-sqlite3` | 0            | `:memory:`       |

### RDS Mode

When `DB_RDS_ENABLED=true`:

- SSL is **always enabled** with `rejectUnauthorized: true`
- Pool configuration is added to `extra`
- Schema moves to `extra.schema` (driver-level)
- Optional IAM auth via `RDS_USE_IAM` and `RDS_REGION`

---

## CRUD

Generic CRUD service and controller factories. Create a full REST endpoint with one call.

### `createCrudService<T>(repo)`

Wraps a TypeORM `Repository` with standard CRUD operations:

| Method             | Description                             |
| ------------------ | --------------------------------------- |
| `findAll()`        | Returns all entities                    |
| `findOne(id)`      | Find by `id` column                     |
| `create(data)`     | Create and save entity                  |
| `update(id, data)` | Partial update, returns updated entity  |
| `remove(id)`       | Delete by `id` (returns `DeleteResult`) |

### `createCrudController<T>(service, options?)`

Generates a NestJS controller class with REST endpoints:

| Method        | Route              | Body      |
| ------------- | ------------------ | --------- |
| `GET /`       | `findAll()`        | —         |
| `GET /:id`    | `findOne(id)`      | —         |
| `POST /`      | `create(data)`     | JSON body |
| `PATCH /:id`  | `update(id, data)` | JSON body |
| `DELETE /:id` | `remove(id)`       | —         |

`options.path` sets the `@Controller()` path prefix.

### Usage

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createCrudService, createCrudController } from '@os.io/nest-kit/bootstrap/typeorm';
import { User } from './user.entity';

const UserService = createCrudService(UserRepository);
const UserController = createCrudController(UserService, { path: 'users' });

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
})
export class UsersModule {}
```

### Customisation

`CrudController` is a dynamic class — extend it or wrap routes:

```ts
const Base = createCrudController(service, { path: 'users' });

@Controller('users')
class UsersController extends Base {
  @Get('stats')
  async stats() {
    return this.service.customQuery();
  }
}
```

---

## Unit of Work

Three patterns for managing database transactions.

### `UnitOfWork` class

| Method                  | Description                                         |
| ----------------------- | --------------------------------------------------- |
| `start()`               | Connect and begin transaction                       |
| `commit()`              | Commit the transaction                              |
| `rollback()`            | Rollback the transaction                            |
| `release()`             | Release the query runner                            |
| `getRepository(entity)` | Get a TypeORM repository scoped to this transaction |

### Patterns

#### C1 — Manual lifecycle

```ts
const uow = new UnitOfWork(dataSource);
await uow.start();

try {
  const repo = uow.getRepository(User);
  await repo.save(user);
  await uow.commit();
} catch (error) {
  await uow.rollback();
} finally {
  await uow.release();
}
```

#### C2 — Factory

```ts
const uow = await createUnitOfWork(dataSource);
// ... use uow
await uow.commit();
await uow.release();
```

#### C3 — Auto (recommended)

```ts
const result = await withUnitOfWork(dataSource, async (uow) => {
  const repo = uow.getRepository(User);
  return repo.save(data);
});
// commits on success, rolls back on error, always releases
```

---

## Transactional Decorator

Declarative transactions — apply `@Transactional()` on a method or `@TransactionalController()` on the whole class.

### `@Transactional(dataSourceProp?)`

Method decorator that wraps a single method in a database transaction.

- `dataSourceProp` — name of the class property holding `DataSource` (default `'dataSource'`)

### `@TransactionalController(dataSourceProp?)`

Class decorator that wraps **every method** of the controller in a database transaction.

- `dataSourceProp` — name of the class property holding `DataSource` (default `'dataSource'`)

### `getCurrentUnitOfWork()`

Returns the active `UnitOfWork` from inside a `@Transactional()` / `@TransactionalController()` method.

### Usage — Method-level

```ts
@Injectable()
export class UsersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Transactional()
  async create(data: Partial<User>): Promise<User> {
    const uow = getCurrentUnitOfWork();
    const repo = uow.getRepository(User);
    return repo.save(data);
  }
}
```

### Usage — Class-level

```ts
@Controller('users')
@TransactionalController()
export class UsersController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Post()
  async create(@Body() data: CreateUserDto) {
    const uow = getCurrentUnitOfWork();
    return uow.getRepository(User).save(data);
  }

  @Get()
  async findAll() {
    const uow = getCurrentUnitOfWork();
    return uow.getRepository(User).find();
  }
}
```

Each method gets its **own** transaction (commit/rollback per request).

### Important

- `getCurrentUnitOfWork()` only works when called from within a `@Transactional()` or `@TransactionalController()` context
- Outside a transaction context it returns `undefined`
- `@TransactionalController()` wraps **every function** on the prototype (excluding constructor); each call is an independent transaction
- If `rollback()` fails, the error is silently discarded and the original error propagates
