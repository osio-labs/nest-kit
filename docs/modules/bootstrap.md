# Bootstrap

> One-liner setup functions for Swagger, Cache, TypeORM, Mongoose, and other popular NestJS modules.

🚧 **Not yet implemented** — coming in an alpha release.

## Sub-modules

| Import path                         | Functions                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@os.io/nest-kit/bootstrap`         | Re-exports all sub-modules                                                                       |
| `@os.io/nest-kit/bootstrap/swagger` | `configSwagger`                                                                                  |
| `@os.io/nest-kit/bootstrap/scalar`  | `configScalarApiDoc`                                                                             |
| `@os.io/nest-kit/bootstrap/cache`   | `configCache`, `configCacheAsync`                                                                |
| `@os.io/nest-kit/bootstrap/typeorm` | `configTypeOrm`, `configTypeOrmAsync`, `createCrudController`, `createCrudService`, `UnitOfWork` |

## Planned API

```ts
import { configSwagger } from '@os.io/nest-kit/bootstrap/swagger';
import { configCache } from '@os.io/nest-kit/bootstrap/cache';
import { configTypeOrm } from '@os.io/nest-kit/bootstrap/typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configSwagger(app, { title: 'My API', version: '1.0.0' });
  configCache(app, { ttl: 60 });
  configTypeOrm(app, { type: 'postgres', url: process.env.DB_URL });

  await app.listen(3000);
}
```

### CRUD factories

```ts
import { createCrudController, createCrudService } from '@os.io/nest-kit/bootstrap/typeorm';

const UserService = createCrudService(User);
const UserController = createCrudController(User);
```

### Unit of Work

```ts
import { UnitOfWork } from '@os.io/nest-kit/bootstrap/typeorm';

// Runs multiple DB operations in a single transaction
const result = await uow.execute(async (manager) => {
  const user = await manager.save(User, { name: 'Alice' });
  const profile = await manager.save(Profile, { userId: user.id });
  return { user, profile };
});
```
