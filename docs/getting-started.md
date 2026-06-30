# Getting Started

## Installation

```bash
npm install @os.io/nest-kit
```

## Quick example

```ts
// Import only what you need via sub-path exports
import { setupSwagger } from '@os.io/nest-kit/bootstrap';
import { RBACGuard } from '@os.io/nest-kit/auth';

// Core utilities are available at the package root
import { someUtil } from '@os.io/nest-kit';
// or explicitly:
import { someUtil } from '@os.io/nest-kit/core';

// Infra sub-modules
import { LoggerService } from '@os.io/nest-kit/infra/logger';
import { S3Storage } from '@os.io/nest-kit/infra/storage';
```

> **Note**: All modules are currently in **alpha** state. APIs may change.
> Check the [changelog](/changelog) for breaking changes.
