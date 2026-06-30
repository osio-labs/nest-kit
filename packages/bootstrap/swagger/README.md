# @os.io/nest-kit/bootstrap/swagger

Sets up **Swagger UI** at the configured path.

> **Peer dependency**: `@nestjs/swagger` is required.

```ts
import { configSwagger } from '@os.io/nest-kit/bootstrap/swagger';

configSwagger(app, {
  title: 'My API',
  path: 'api/docs',
});
```

### Options (`ConfigSwaggerOptions`)

| Option                   | Type                     | Default        |
| ------------------------ | ------------------------ | -------------- |
| `title`                  | `string`                 | `'NestJS API'` |
| `description`            | `string`                 | `''`           |
| `version`                | `string`                 | `'1.0'`        |
| `path`                   | `string`                 | `'api/docs'`   |
| `swaggerCustomOptions`   | `SwaggerCustomOptions`   | —              |
| `swaggerDocumentOptions` | `SwaggerDocumentOptions` | —              |

> `persistAuthorization` defaults to `true`.
