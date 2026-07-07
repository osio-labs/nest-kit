# Bootstrap

> One-liner setup functions for Swagger, Cache, and TypeORM.

---

## Navigation

| Module  | Exports                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------- |
| OpenAPI | `configOpenApi`                                                                                |
| Cache   | `configCache`                                                                                  |
| TypeORM | `configTypeOrm`, `createCrudService`, `createCrudController`, `UnitOfWork`, `@Transactional()` |

---

## OpenAPI

Auto-detects Scalar UI (if `@scalar/nestjs-api-reference` is installed) or falls back to Swagger UI:

```ts
import { configOpenApi } from '@os.io/nest-kit/bootstrap';

const app = await NestFactory.create(AppModule);
await configOpenApi(app, { title: 'My API', version: '1.0.0' });
```

[→ OpenAPI docs](./bootstrap-openapi)

## Cache

Build `CacheModule.register()` options from env or `ConfigService`:

```ts
import { CacheModule } from '@nestjs/cache-manager';
import { configCache } from '@os.io/nest-kit/bootstrap';

@Module({
  imports: [CacheModule.register(configCache())],
})
export class AppModule {}
```

Supports memory, Redis, Valkey, multi-store, named stores, and RDS TLS mode.

[→ Full docs](./bootstrap-cache)

## TypeORM

Three toolkits in one module:

| Toolkit | Purpose                                                                                 |
| ------- | --------------------------------------------------------------------------------------- |
| Config  | `configTypeOrm` — connection setup from env or `ConfigService`                          |
| CRUD    | `createCrudService` / `createCrudController` — generic REST factories                   |
| UoW     | `UnitOfWork`, `@Transactional()`, `@TransactionalController()` — transaction management |

All available from `@os.io/nest-kit/bootstrap`:

```ts
import {
  configTypeOrm,
  createCrudService,
  createCrudController,
  UnitOfWork,
} from '@os.io/nest-kit/bootstrap';
```

[→ Full docs](./bootstrap-typeorm)
