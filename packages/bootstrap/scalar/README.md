# @os.io/nest-kit/bootstrap/scalar

Sets up **Scalar API Reference** at the configured path.

> **Peer dependency**: `@nestjs/swagger` is required. `@scalar/nestjs-api-reference` is optional.

```ts
import { configScalarApiDoc } from '@os.io/nest-kit/bootstrap/scalar';

configScalarApiDoc(app, {
  title: 'My API',
  path: 'api/scalar',
});
```

### Options (`ConfigScalarOptions`)

| Option                   | Type                           | Default        |
| ------------------------ | ------------------------------ | -------------- |
| `title`                  | `string`                       | `'NestJS API'` |
| `description`            | `string`                       | `''`           |
| `version`                | `string`                       | `'1.0'`        |
| `path`                   | `string`                       | `'api/docs'`   |
| `scalarOptions`          | `NestJSReferenceConfiguration` | —              |
| `swaggerDocumentOptions` | `SwaggerDocumentOptions`       | —              |

> `@scalar/nestjs-api-reference` is optional. If not installed, the function logs a warning and skips setup.
