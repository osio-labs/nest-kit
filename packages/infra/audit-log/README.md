# @os.io/nest-kit/infra/audit-log

Audit trail for NestJS — track who did what and when. Automatically captures
user actions, data changes, and security events with structured diffs, IP,
user-agent, and organization scoping.

## Features

- **Automatic audit trail** — log every action with resource, user, and context
- **Structured diffs** — track before/after values for updates
- **Flexible querying** — filter by resource, user, organization, action, date range, path
- **IP & user-agent capture** — built-in request context fields via `Scope.REQUEST`
- **Multiple storage backends** — TypeORM, Elasticsearch, MongoDB, AWS CloudTrail, GCP Cloud Logging, OCI Logging, Pangea, Sentry, Console
- **Custom repository support** — implement `AuditLogRepository` for any backend
- **Action filtering** — reduce noise with `enabledActions` and `excludePaths`

## Installation

```bash
npm install @os.io/nest-kit
```

## Quick Start

### TypeORM backend (default)

```typescript
import { Module } from '@nestjs/common';
import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';

@Module({
  imports: [AuditLogModule.forRoot()],
})
export class AppModule {}
```

This auto-registers as a `@Global()` module, so you only need to import it once.

### Inject the service

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogService } from '@os.io/nest-kit/infra/audit-log';

@Injectable()
export class OrderService {
  constructor(private readonly auditLog: AuditLogService) {}

  async updateOrder(id: string) {
    await this.auditLog.record({
      action: 'order.updated',
      resource: 'order',
      resourceId: id,
      userId: currentUser.id,
      diff: {
        status: { from: 'pending', to: 'confirmed' },
        total: { from: 99.99, to: 89.99 },
      },
    });
  }
}
```

## API

### `AuditLogService`

| Method                                       | Description                         |
| -------------------------------------------- | ----------------------------------- |
| `record(params)`                             | Create a new audit-log entry        |
| `find(query)`                                | Query entries with filters          |
| `count(query)`                               | Count matching entries              |
| `findById(id)`                               | Get a single entry by ID            |
| `findByResource(resource, resourceId)`       | Get entries for a specific resource |
| `findByUser(userId, limit?)`                 | Get entries by user (default 50)    |
| `findByOrganization(organizationId, limit?)` | Get entries by org (default 50)     |

### `record()` params

| Field            | Type                                             | Required | Description                                      |
| ---------------- | ------------------------------------------------ | -------- | ------------------------------------------------ |
| `action`         | `string`                                         | Yes      | Action name (e.g. `user.login`, `order.created`) |
| `resource`       | `string`                                         | Yes      | Resource type (e.g. `user`, `order`)             |
| `resourceId`     | `string`                                         | Yes      | ID of the target resource                        |
| `userId`         | `string`                                         | No       | Who performed the action                         |
| `organizationId` | `string`                                         | No       | Org scope                                        |
| `metadata`       | `Record<string, unknown>`                        | No       | Arbitrary extra data                             |
| `diff`           | `Record<string, { from: unknown; to: unknown }>` | No       | Before/after values                              |
| `ip`             | `string`                                         | No       | Client IP (auto-captured if omitted)             |
| `userAgent`      | `string`                                         | No       | User-Agent (auto-captured if omitted)            |
| `path`           | `string`                                         | No       | Request path                                     |

### `find()` query filters

| Field            | Type     | Description                    |
| ---------------- | -------- | ------------------------------ |
| `resource`       | `string` | Filter by resource type        |
| `resourceId`     | `string` | Filter by resource ID          |
| `userId`         | `string` | Filter by user                 |
| `organizationId` | `string` | Filter by org                  |
| `action`         | `string` | Filter by action name          |
| `path`           | `string` | Filter by request path         |
| `from` / `to`    | `Date`   | Date range                     |
| `limit`          | `number` | Max results (default no limit) |
| `offset`         | `number` | Pagination offset              |

## Configuration

### Module options

```typescript
AuditLogModule.forRoot({
  captureRequestContext: true, // auto-capture IP + user-agent (default: true)
  global: true, // register as @Global() (default: true)
  defaultMetadata: { appVersion: '1.0.0' },

  // Filtering
  enabledActions: ['user.login', 'order.created', 'order.updated'],
  excludePaths: ['/health', '/metrics', '/favicon.ico'],

  // Custom repository (see adapters below)
  repository: myCustomRepo,

  // TypeORM
  typeorm: { enabled: true }, // set false to disable TypeORM
});
```

### Async configuration

```typescript
AuditLogModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    defaultMetadata: { appVersion: config.get('APP_VERSION') },
  }),
  inject: [ConfigService],
});
```

## Entity

When using the TypeORM backend, the `AuditLogEntity` creates the `audit_log` table:

| Column            | Type         | Description                        |
| ----------------- | ------------ | ---------------------------------- |
| `id`              | UUID (PK)    | Auto-generated                     |
| `action`          | varchar(100) | Indexed — audited action           |
| `resource`        | varchar(255) | Indexed — resource type            |
| `resource_id`     | varchar(255) | Target resource ID                 |
| `user_id`         | varchar(255) | Indexed — who performed the action |
| `organization_id` | varchar(255) | Indexed — org scope                |
| `metadata`        | simple-json  | Arbitrary extra data               |
| `diff`            | simple-json  | Before/after diff                  |
| `ip`              | varchar(45)  | Client IP address                  |
| `user_agent`      | varchar(500) | User-Agent string                  |
| `path`            | varchar(512) | Request path                       |
| `created_at`      | timestamp    | Auto-generated                     |

## Adapters

The module ships with built-in adapters for multiple audit-log backends.
Each adapter implements `AuditLogRepository` and can be passed as the
`repository` option.

### Overview

| Category      | Adapter           | Extra dep                    | Full query | Emit-only |
| ------------- | ----------------- | ---------------------------- | ---------- | --------- |
| **Database**  | TypeORM (default) | ❌                           | ✅         | ❌        |
|               | Elasticsearch     | `@elastic/elasticsearch`     | ✅         | ❌        |
|               | MongoDB           | `mongodb`                    | ✅         | ❌        |
| **Cloud**     | AWS CloudTrail    | `@aws-sdk/client-cloudtrail` | ⚠️ partial | ❌        |
|               | GCP Cloud Logging | `@google-cloud/logging`      | ✅         | ❌        |
|               | OCI Logging       | `oci-sdk`                    | ✅         | ❌        |
|               | Pangea Audit      | `pangea-node-sdk`            | ✅         | ❌        |
| **Dev tools** | Sentry            | `@sentry/node`               | ❌         | ✅        |
|               | Console           | none                         | ❌         | ✅        |

---

### Database adapters

TypeORM, Elasticsearch, and MongoDB store data locally or in self-hosted
infrastructure. All three support full CRUD querying (`find`, `count`, `findById`).

#### TypeORM (default)

Uses your existing database via TypeORM. Requires `@nestjs/typeorm` and `typeorm`.

```typescript
import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';

@Module({
  imports: [AuditLogModule.forRoot()],
})
export class AppModule {}
```

No extra dependency — ships with the package. The entity creates the `audit_log` table automatically.

#### Elasticsearch

Index audit entries in Elasticsearch for full-text search and aggregation.

**Install:** `npm install @elastic/elasticsearch`

```typescript
import { ElasticsearchAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new ElasticsearchAdapter({ node: 'http://localhost:9200' }),
});
```

| Option   | Default                 | Description                           |
| -------- | ----------------------- | ------------------------------------- |
| `node`   | `http://localhost:9200` | Elasticsearch node URL                |
| `apiKey` | —                       | API key for auth                      |
| `index`  | `audit-log`             | Index name                            |
| `client` | —                       | Pre-configured `Client` (for testing) |

#### MongoDB

Store entries in a MongoDB collection with indexes on key fields.

**Install:** `npm install mongodb`

```typescript
import { MongoAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new MongoAdapter({ uri: 'mongodb://localhost:27017' }),
});
```

| Option       | Default                     | Description                                |
| ------------ | --------------------------- | ------------------------------------------ |
| `uri`        | `mongodb://localhost:27017` | Connection URI                             |
| `database`   | `audit`                     | Database name                              |
| `collection` | `audit_log`                 | Collection name                            |
| `client`     | —                           | Pre-configured `MongoClient` (for testing) |

---

### Cloud logging adapters

AWS CloudTrail, GCP Cloud Logging, OCI Logging, and Pangea Audit send entries
to cloud-managed logging services. Entries are immutable and stored off-site.

#### AWS CloudTrail

Send audit events to AWS CloudTrail.

**Install:** `npm install @aws-sdk/client-cloudtrail`

```typescript
import { CloudTrailAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new CloudTrailAdapter({ region: 'us-east-1' }),
});
```

**Limitations:**

- `find()` uses `LookupEvents` — limited query options
- `findById()` iterates all events (not recommended for production)
- Events appear ~5 minutes after submission
- `count()` is client-side

#### Google Cloud Logging

Write audit entries to GCP Cloud Logging.

**Install:** `npm install @google-cloud/logging`

```typescript
import { GcpCloudLoggingAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new GcpCloudLoggingAdapter({ projectId: 'my-project' }),
});
```

| Option         | Default                      | Description                            |
| -------------- | ---------------------------- | -------------------------------------- |
| `projectId`    | `process.env.GCP_PROJECT_ID` | GCP project ID                         |
| `logName`      | `audit-trail`                | Log name                               |
| `resourceType` | `global`                     | GCP monitored resource type            |
| `client`       | —                            | Pre-configured `Logging` (for testing) |

#### OCI Logging

Store audit entries in OCI Logging and optionally query native OCI Audit events.

**Install:** `npm install oci-sdk`

```typescript
import { OciLoggingAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new OciLoggingAdapter({
    logGroupId: process.env.OCI_LOG_GROUP_ID,
    compartmentId: process.env.OCI_COMPARTMENT_ID,
  }),
});
```

| Option          | Default                          | Description                              |
| --------------- | -------------------------------- | ---------------------------------------- |
| `logGroupId`    | `process.env.OCI_LOG_GROUP_ID`   | OCI log group OCID                       |
| `compartmentId` | `process.env.OCI_COMPARTMENT_ID` | OCI compartment OCID                     |
| `profile`       | `DEFAULT`                        | OCI config profile                       |
| `loggingClient` | —                                | Pre-configured `LoggingManagementClient` |
| `searchClient`  | —                                | Pre-configured `LoggingSearchClient`     |
| `auditClient`   | —                                | Pre-configured `AuditClient`             |

#### Pangea Audit

Record audit events via Pangea's Secure Audit Log API.

**Install:** `npm install pangea-node-sdk`

```typescript
import { PangeaAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new PangeaAdapter({
    token: process.env.PANGEA_AUDIT_TOKEN,
    domain: process.env.PANGEA_DOMAIN,
  }),
});
```

| Option     | Default                          | Description                                 |
| ---------- | -------------------------------- | ------------------------------------------- |
| `token`    | `process.env.PANGEA_AUDIT_TOKEN` | Pangea API token                            |
| `domain`   | `process.env.PANGEA_DOMAIN`      | Pangea domain                               |
| `configId` | —                                | Pangea Audit config ID                      |
| `client`   | —                                | Pre-configured `AuditService` (for testing) |

---

### Dev tool adapters

Sentry and Console are **emit-only** — they log audit entries to external
services or stdout but do not support querying (`find`, `count`, `findById`
return empty results). Use them alongside a full-featured backend, or during
development.

#### Sentry

Send audit entries as breadcrumbs to Sentry. Useful for correlating audit
events with error reports.

**Install:** `npm install @sentry/node`

```typescript
import { SentryAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new SentryAdapter({ level: 'info' }),
});
```

| Option   | Default                  | Description                              |
| -------- | ------------------------ | ---------------------------------------- |
| `dsn`    | `process.env.SENTRY_DSN` | Sentry DSN                               |
| `level`  | `info`                   | Event level (`info`, `warning`, `error`) |
| `client` | —                        | Pre-configured Sentry (for testing)      |

#### Console

Print audit entries to the console. Ideal for local development and debugging.

```typescript
import { ConsoleAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new ConsoleAdapter({ format: 'pretty' }),
});
```

| Option   | Default       | Description                        |
| -------- | ------------- | ---------------------------------- |
| `format` | `json`        | Output format (`json` or `pretty`) |
| `logger` | `console.log` | Custom logger function             |

---

### Custom backend

Implement the `AuditLogRepository` interface for any storage system:

```typescript
import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';
import type {
  AuditLogEntry,
  AuditLogQuery,
  AuditLogRepository,
} from '@os.io/nest-kit/infra/audit-log';

class MongoAuditRepository implements AuditLogRepository {
  async save(entry) {
    const doc = await myCollection.insertOne({ ...entry, createdAt: new Date() });
    return { id: doc.insertedId.toString(), ...entry, createdAt: new Date() };
  }
  async find(query) {
    return myCollection.find(query).toArray();
  }
  async count(query) {
    return myCollection.countDocuments(query);
  }
  async findById(id) {
    return myCollection.findOne({ _id: id });
  }
}

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new MongoAuditRepository(),
});
```

## Architecture

```
┌──────────────┐     record/find      ┌──────────────────────┐
│  Controller  │ ────────────────────>│   AuditLogService    │
└──────────────┘                      │ (Scope.REQUEST)      │
                                      │                      │
User Service ────────────────────────>│  • captureIp()       │
                                      │  • captureUserAgent()│
┌──────────────┐                      │  • enabledActions[]  │
│  Cron Job    │ ────────────────────>│  • excludePaths[]    │
└──────────────┘                      └──────────┬───────────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │  AuditLogRepository     │
                                    │  (interface)             │
                                    └────────────┬────────────┘
                                                 │
          ┌───────────┬──────────┬───────────┬────────────┬──────┴──────┬───────────┬──────────┐
          │           │          │           │            │             │           │          │
     ┌────┴────┐ ┌───┴────┐ ┌───┴────┐ ┌────┴─────┐ ┌───┴──────┐ ┌───┴────┐ ┌───┴────┐ ┌───┴──────┐
     │ TypeORM │ │Elastic-│ │ MongoDB│ │   AWS    │ │   GCP    │ │  OCI   │ │ Pangea │ │ Console  │
     │(default)│ │search  │ │        │ │CloudTrail│ │  Cloud   │ │Logging │ │  Audit │ │+ Sentry  │
     └─────────┘ └────────┘ └────────┘ └──────────┘ └──────────┘ └────────┘ └────────┘ └──────────┘
```

## Comparison

### Full-featured backends

| Feature             | TypeORM | Elasticsearch | MongoDB | CloudTrail  | GCP Logging | OCI Logging | Pangea |
| ------------------- | ------- | ------------- | ------- | ----------- | ----------- | ----------- | ------ |
| No extra dep        | ✅      | ❌            | ❌      | ❌          | ❌          | ❌          | ❌     |
| Full query (`find`) | ✅      | ✅            | ✅      | ⚠️ partial  | ✅          | ✅          | ✅     |
| `count()`           | ✅      | ✅            | ✅      | ❌          | ❌          | ❌          | ✅     |
| `findById()`        | ✅      | ✅            | ✅      | ⚠️ scan all | ⚠️ scan all | ⚠️ scan all | ✅     |
| Local/dev friendly  | ✅      | ✅            | ✅      | ❌          | ❌          | ❌          | ✅     |
| Cloud-managed       | ❌      | ✅            | ❌      | ✅          | ✅          | ✅          | ✅     |
| Immutable audit     | ❌      | ❌            | ❌      | ✅          | ✅          | ✅          | ✅     |
| Cross-region query  | ✅      | ✅            | ✅      | ✅          | ✅          | ✅          | ✅     |

### Emit-only backends

| Feature             | Sentry | Console |
| ------------------- | ------ | ------- |
| No extra dep        | ❌     | ✅      |
| Full query (`find`) | ❌     | ❌      |
| `count()`           | ❌     | ❌      |
| `findById()`        | ❌     | ❌      |
| Local/dev friendly  | ✅     | ✅      |
| Cloud-managed       | ✅     | ❌      |
| Immutable audit     | ❌     | ❌      |
| Cross-region query  | ❌     | ❌      |
