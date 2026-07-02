# Infra / Audit Log

> Audit trail for NestJS — track who did what and when. Automatically captures user actions, data changes, and security events with structured diffs, IP, user-agent, and organization scoping.

```
@os.io/nest-kit/infra/audit-log
```

---

## Installation

```bash
npm install @os.io/nest-kit
```

Optional peer dependencies for non-TypeORM backends:

```bash
# Elasticsearch
npm install @elastic/elasticsearch

# MongoDB
npm install mongodb

# AWS CloudTrail
npm install @aws-sdk/client-cloudtrail

# Google Cloud Logging
npm install @google-cloud/logging

# OCI Logging
npm install oci-sdk

# Pangea Audit
npm install pangea-node-sdk

# Sentry
npm install @sentry/node
```

All optional deps are loaded lazily — safe to import without them; errors thrown only on use.

---

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

---

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

  // Custom repository (see backends below)
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

---

## Backends

The module ships with built-in adapters for multiple audit-log backends. Each adapter implements `AuditLogRepository` and can be passed as the `repository` option.

:::tabs
== TypeORM

Uses your existing database via TypeORM. Requires `@nestjs/typeorm` and `typeorm`.

```typescript
AuditLogModule.forRoot();
```

== Elasticsearch

Index audit entries for full-text search and aggregation.

**Install:** `npm install @elastic/elasticsearch`

```typescript
import { ElasticsearchAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new ElasticsearchAdapter({ node: 'http://localhost:9200' }),
});
```

| Option   | Default                 | Description             |
| -------- | ----------------------- | ----------------------- |
| `node`   | `http://localhost:9200` | Node URL                |
| `apiKey` | —                       | API key                 |
| `index`  | `audit-log`             | Index name              |
| `client` | —                       | Pre-configured `Client` |

== MongoDB

Store entries in a MongoDB collection with indexes on key fields.

**Install:** `npm install mongodb`

```typescript
import { MongoAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new MongoAdapter({ uri: 'mongodb://localhost:27017' }),
});
```

| Option       | Default                     | Description                  |
| ------------ | --------------------------- | ---------------------------- |
| `uri`        | `mongodb://localhost:27017` | Connection URI               |
| `database`   | `audit`                     | Database name                |
| `collection` | `audit_log`                 | Collection name              |
| `client`     | —                           | Pre-configured `MongoClient` |

== CloudTrail

Send audit events to AWS CloudTrail.

**Install:** `npm install @aws-sdk/client-cloudtrail`

```typescript
import { CloudTrailAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new CloudTrailAdapter({ region: 'us-east-1' }),
});
```

**Limitations:** `find()` uses `LookupEvents` (limited querying); `findById()` scans all events; events appear ~5 min after submission; `count()` is client-side.

== GCP Logging

Write audit entries to GCP Cloud Logging.

**Install:** `npm install @google-cloud/logging`

```typescript
import { GcpCloudLoggingAdapter } from '@os.io/nest-kit/infra/audit-log/adapters';

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new GcpCloudLoggingAdapter({ projectId: 'my-project' }),
});
```

| Option         | Default                      | Description                 |
| -------------- | ---------------------------- | --------------------------- |
| `projectId`    | `process.env.GCP_PROJECT_ID` | GCP project ID              |
| `logName`      | `audit-trail`                | Log name                    |
| `resourceType` | `global`                     | GCP monitored resource type |
| `client`       | —                            | Pre-configured `Logging`    |

== OCI Logging

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
| `logGroupId`    | `process.env.OCI_LOG_GROUP_ID`   | Log group OCID                           |
| `compartmentId` | `process.env.OCI_COMPARTMENT_ID` | Compartment OCID                         |
| `profile`       | `DEFAULT`                        | OCI config profile                       |
| `loggingClient` | —                                | Pre-configured `LoggingManagementClient` |
| `searchClient`  | —                                | Pre-configured `LoggingSearchClient`     |
| `auditClient`   | —                                | Pre-configured `AuditClient`             |

== Pangea

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

| Option     | Default                          | Description                   |
| ---------- | -------------------------------- | ----------------------------- |
| `token`    | `process.env.PANGEA_AUDIT_TOKEN` | Pangea API token              |
| `domain`   | `process.env.PANGEA_DOMAIN`      | Pangea domain                 |
| `configId` | —                                | Audit config ID               |
| `client`   | —                                | Pre-configured `AuditService` |

== Sentry

Send audit entries as breadcrumbs to correlate with error reports.

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
| `client` | —                        | Pre-configured Sentry                    |

**Limitations:** `find()`, `count()`, `findById()` not supported — emit-only.

== Console

Print audit entries to stdout. Ideal for local development. No extra dependency.

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

**Limitations:** `find()`, `count()`, `findById()` not supported — emit-only.
:::

### Custom backend

Implement `AuditLogRepository` for any storage system:

```typescript
import { AuditLogModule } from '@os.io/nest-kit/infra/audit-log';
import type {
  AuditLogEntry,
  AuditLogQuery,
  AuditLogRepository,
} from '@os.io/nest-kit/infra/audit-log';

class MongoAuditRepository implements AuditLogRepository {
  async save(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const doc = await myMongoCollection.insertOne({ ...entry, createdAt: new Date() });
    return { id: doc.insertedId.toString(), ...entry, createdAt: new Date() };
  }

  async find(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    return myMongoCollection.find(query).toArray();
  }

  async count(query: AuditLogQuery): Promise<number> {
    return myMongoCollection.countDocuments(query);
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    return myMongoCollection.findOne({ _id: id });
  }
}

AuditLogModule.forRoot({
  typeorm: { enabled: false },
  repository: new MongoAuditRepository(),
});
```

---

## API

### AuditLogService

| Method                                       | Description                         |
| -------------------------------------------- | ----------------------------------- |
| `record(params)`                             | Create a new audit-log entry        |
| `find(query)`                                | Query entries with filters          |
| `count(query)`                               | Count matching entries              |
| `findById(id)`                               | Get a single entry by ID            |
| `findByResource(resource, resourceId)`       | Get entries for a specific resource |
| `findByUser(userId, limit?)`                 | Get entries by user (default 50)    |
| `findByOrganization(organizationId, limit?)` | Get entries by org (default 50)     |

### record() params

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

### find() query filters

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

### Module Options

| Option                  | Type                      | Default             | Description                      |
| ----------------------- | ------------------------- | ------------------- | -------------------------------- |
| `captureRequestContext` | `boolean`                 | `true`              | Auto-capture IP + user-agent     |
| `global`                | `boolean`                 | `true`              | Register as `@Global()`          |
| `defaultMetadata`       | `Record<string, unknown>` | —                   | Extra metadata on every entry    |
| `enabledActions`        | `string[]`                | —                   | Only log these actions           |
| `excludePaths`          | `string[]`                | —                   | Skip logging for these paths     |
| `repository`            | `AuditLogRepository`      | TypeORM             | Custom repository implementation |
| `typeorm`               | `{ enabled: boolean }`    | `{ enabled: true }` | TypeORM backend toggle           |

### Exported Values

| Export               | Kind      | Description            |
| -------------------- | --------- | ---------------------- |
| `AuditLogModule`     | Class     | NestJS dynamic module  |
| `AuditLogService`    | Class     | Request-scoped service |
| `AuditLogEntity`     | Class     | TypeORM entity         |
| `AuditLogRepository` | Interface | Repository contract    |
| `AuditLogEntry`      | Interface | Log entry shape        |
| `AuditLogQuery`      | Interface | Query filter shape     |
