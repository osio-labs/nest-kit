# @os.io/nest-kit/bootstrap

Helpers and configuration bootstrappers for popular NestJS modules — read environment variables or `ConfigService` to build module options in one call.

## Sub‑modules

| Sub‑module                                               | README                     |
| -------------------------------------------------------- | -------------------------- |
| `typeorm` — config, CRUD, UoW, `@HalfUnique()`           | [📄](typeorm/README.md)    |
| `cache` — config (memory / Redis / Valkey / multi‑store) | [📄](cache/README.md)      |
| `queue` — config (BullMQ)                                | [📄](queue/README.md)      |
| `sentry` — config, `initSentry()`                        | [📄](sentry/README.md)     |
| `openapi` — Swagger / Scalar docs                        | [📄](openapi/README.md)    |
| `validation` — ValidationPipe (normal / i18n)            | [📄](validation/README.md) |

## Quick start

```ts
// main.ts — app config
import { configOpenApi, configValidation } from '@os.io/nest-kit/bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configOpenApi(app);
  configValidation(app);
  await app.listen(3000);
}
```

```ts
// app.module.ts — module registration
import { configTypeOrm, configCache, configQueue, configSentry } from '@os.io/nest-kit/bootstrap';

@Module({
  imports: [
    TypeOrmModule.forRoot(configTypeOrm()),
    CacheModule.register(configCache({ stores: [{ type: 'memory' }] })),
    BullModule.forRoot(configQueue()),
    SentryModule.forRoot(configSentry()),
  ],
})
export class AppModule {}
```

> `configTypeOrm`, `configCache`, `configQueue`, `configSentry` are `undefined` when the required peer dependency is not installed — no crash on import.
