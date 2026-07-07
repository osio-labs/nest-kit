# Bootstrap / Validation

> Global validation configuration for NestJS applications. Auto-detects `nestjs-i18n` and selects the appropriate validation pipe.

## Install

```bash
npm install @os.io/nest-kit
```

Optional — i18n validation messages (see [nestjs-i18n.com](https://nestjs-i18n.com)):

```bash
npm install nestjs-i18n
```

## Quick Start

### `configValidation` (auto-detect)

Call in `main.ts`. Uses `I18nValidationPipe` when `nestjs-i18n` is installed, otherwise falls back to `ValidationPipe`:

```ts
import { NestFactory } from '@nestjs/core';
import { configValidation } from '@os.io/nest-kit/bootstrap';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configValidation(app);
  await app.listen(3000);
}
```

With custom options:

```ts
configValidation(app, {
  whitelist: false,
  forbidNonWhitelisted: false,
  detailedErrors: false,
});
```

## Options

| Option                     | Default | Description                                      |
| -------------------------- | ------- | ------------------------------------------------ |
| `transform`                | `true`  | Auto-transform payloads to DTO instances         |
| `enableImplicitConversion` | `true`  | Implicit primitive conversion (e.g. `"1"` → `1`) |
| `whitelist`                | `true`  | Strip unknown properties                         |
| `forbidNonWhitelisted`     | `true`  | Throw on unknown properties                      |
| `detailedErrors`           | `true`  | Show detailed error messages                     |

## API

### `configValidation(app, options?)`

Async function. When `nestjs-i18n` is available → applies `I18nValidationPipe` + `I18nValidationExceptionFilter`. Otherwise → applies standard `ValidationPipe`.
