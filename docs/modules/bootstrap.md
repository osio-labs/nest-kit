# Bootstrap

> One-liner setup functions for Swagger, Cache, TypeORM, Mongoose, and other popular NestJS modules.

🚧 **Not yet implemented** — coming in an alpha release.

```ts
import { setupSwagger } from '@oxpo/nest-kit/bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupSwagger(app, {
    title: 'My API',
    version: '1.0.0',
    path: 'docs',
  });
  await app.listen(3000);
}
```
