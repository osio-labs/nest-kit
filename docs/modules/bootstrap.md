# Bootstrap

> One-liner setup functions for Swagger, Cache, and TypeORM.

---

## Navigation

| Path                | Module                          | Exports                                                                                                              |
| ------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `bootstrap/swagger` | Swagger API Doc                 | `configSwagger`                                                                                                      |
| `bootstrap/scalar`  | Scalar API Reference            | `configScalarApiDoc`                                                                                                 |
| `bootstrap/cache`   | Cache (memory / Redis / Valkey) | `configCache`, `configCacheAsync`                                                                                    |
| `bootstrap/typeorm` | TypeORM connection, CRUD, UoW   | `configTypeOrm`, `configTypeOrmAsync`, `createCrudService`, `createCrudController`, `UnitOfWork`, `@Transactional()` |

---

## Sub-modules

### `bootstrap/swagger` — Swagger API Doc

Set up Swagger UI in one call:

```ts
import { configSwagger } from '@os.io/nest-kit/bootstrap/swagger';

const app = await NestFactory.create(AppModule);
configSwagger(app, { title: 'My API', version: '1.0.0' });
```

[→ Full docs](./bootstrap-swagger)

### `bootstrap/scalar` — Scalar API Reference

Set up the Scalar API reference UI in one call:

```ts
import { configScalarApiDoc } from '@os.io/nest-kit/bootstrap/scalar';

const app = await NestFactory.create(AppModule);
configScalarApiDoc(app, { title: 'My API', version: '1.0.0' });
```

[→ Full docs](./bootstrap-scalar)

### `bootstrap/cache` — Cache Module

Build `CacheModule.register()` options from env or `ConfigService`:

```ts
import { CacheModule } from '@nestjs/cache-manager';
import { configCache } from '@os.io/nest-kit/bootstrap/cache';

@Module({
  imports: [CacheModule.register(configCache())],
})
export class AppModule {}
```

Supports memory, Redis, Valkey, multi-store, named stores, and RDS TLS mode.

[→ Full docs](./bootstrap-cache)

### `bootstrap/typeorm` — TypeORM

Three toolkits in one module:

| Sub-module | Purpose                                                                                 |
| ---------- | --------------------------------------------------------------------------------------- |
| `config`   | `configTypeOrm` / `configTypeOrmAsync` — connection setup from env or `ConfigService`   |
| `crud`     | `createCrudService` / `createCrudController` — generic REST factories                   |
| `uow`      | `UnitOfWork`, `@Transactional()`, `@TransactionalController()` — transaction management |

```ts
import {
  configTypeOrm,
  createCrudService,
  createCrudController,
  UnitOfWork,
} from '@os.io/nest-kit/bootstrap/typeorm';
```

[→ Full docs](./bootstrap-typeorm)
