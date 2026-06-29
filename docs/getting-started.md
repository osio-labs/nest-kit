# Getting Started

## Installation

```bash
npm install @oxpo/nest-kit
```

## Quick example

```ts
// Import only what you need via sub-path exports
import { setupSwagger } from '@oxpo/nest-kit/bootstrap';
import { RBACGuard } from '@oxpo/nest-kit/auth';

// Core utilities are available at the package root
import { someUtil } from '@oxpo/nest-kit';
// or explicitly:
import { someUtil } from '@oxpo/nest-kit/core';

// Infra sub-modules
import { LoggerService } from '@oxpo/nest-kit/infra/logger';
import { S3Storage } from '@oxpo/nest-kit/infra/storage';
```

> **Note**: All modules are currently in **alpha** state. APIs may change.
> Check the [changelog](/changelog) for breaking changes.
