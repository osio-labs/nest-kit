# Bootstrap

> `configXxx()` helpers that read **environment variables** and return options objects
> ready to pass to NestJS `forRoot()` — zero abstraction, full control.

---

## What it is

Functions that build config objects from env vars. Use them directly in
`app.module.ts` and `main.ts`.

---

## Module registration (app.module.ts)

```ts
TypeOrmModule.forRoot(configTypeOrm());
CacheModule.register(configCache());
BullModule.forRoot(configQueue());
SentryModule.forRoot(configSentry());
```

| Helper            | What it reads from env                                    |
| ----------------- | --------------------------------------------------------- |
| `configTypeOrm()` | `DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, …         |
| `configCache()`   | `CACHE_TTL`, `CACHE_STORE`, `REDIS_HOST`, `REDIS_PORT`, … |
| `configQueue()`   | `QUEUE_HOST`, `QUEUE_PORT`, …                             |
| `configSentry()`  | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, …                     |

Each helper also accepts an optional `ConfigService` for the async pattern:

```ts
TypeOrmModule.forRootAsync({
  useFactory: (cs) => configTypeOrm(undefined, cs),
  inject: [ConfigService],
});
```

---

## App config (main.ts)

```ts
configOpenApi(app, { title: 'My API' });
configValidation(app);
```

| Helper                  | What it does                             |
| ----------------------- | ---------------------------------------- |
| `configOpenApi(app)`    | Swagger/Scalar doc setup from env        |
| `configValidation(app)` | `ValidationPipe` from `VALIDATION_*` env |

---

## Per-module docs

### Module registration

- [TypeORM](./bootstrap-typeorm) — `configTypeOrm()`, CRUD factories + Unit of Work
- [Cache](./bootstrap-cache) — `configCache()`
- [Queue](./bootstrap-queue) — `configQueue()`
- [Sentry](./bootstrap-sentry) — `configSentry()`, `initSentry()`

### App config

- [OpenAPI](./bootstrap-openapi) — `configOpenApi()`
- [Validation](./bootstrap-validation) — `configValidation()`
