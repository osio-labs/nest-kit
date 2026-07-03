# Infra / Notification

> Multi-channel notification module for NestJS. Send messages via email, SMS, push notifications, Telegram, and Slack — with multiple providers per channel, optional queuing, and optional persistence.

```
@os.io/nest-kit/infra/notification
```

---

## Features

- **7 channels**: Email, SMS, Push, Telegram, Slack, Teams, Google Chat
- **14+ providers**: SendGrid, Google SMTP, Mailgun, SES, SMTP, Twilio, Vonage, SNS, Firebase, APNs, Telegram Bot, Slack, Teams, Google Chat
- **Parallel sending**: Fire multiple providers simultaneously per channel
- **[Queue support](#queue-support)**: Optional Bull/BullMQ integration (enqueue → process async)
- **[Persistence & status tracking](#storage--status-tracking)**: Optional TypeORM / in-memory storage with status tracking
- **[Async configuration](#async-configuration)**: Use `forRootAsync` with factory providers and dependency injection

---

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { NotificationModule } from '@os.io/nest-kit/infra/notification';
import {
  SmtpEmailProvider,
  TwilioSmsProvider,
  TelegramProvider,
} from '@os.io/nest-kit/infra/notification/providers';
import { MemoryNotificationStore } from '@os.io/nest-kit/infra/notification/stores';

@Module({
  imports: [
    NotificationModule.forRoot({
      providers: {
        email: [
          new SmtpEmailProvider({
            host: 'smtp.example.com',
            port: 587,
            user: 'user',
            pass: 'pass',
            defaultFrom: 'noreply@example.com',
          }),
        ],
        sms: [
          new TwilioSmsProvider({
            accountSid: process.env.TWILIO_SID,
            authToken: process.env.TWILIO_TOKEN,
            from: '+1234567890',
          }),
        ],
        telegram: [new TelegramProvider({ botToken: process.env.TELEGRAM_BOT_TOKEN })],
      },
      storage: { enabled: true, store: new MemoryNotificationStore() },
      parallel: true,
    }),
  ],
})
export class AppModule {}
```

See [Queue support](#queue-support) to process notifications asynchronously with Bull/BullMQ, and [Storage & Status Tracking](#storage--status-tracking) for persistence options.

---

## Usage

```typescript
import { Injectable } from '@nestjs/common';
import { NotificationService } from '@os.io/nest-kit/infra/notification';

@Injectable()
export class WelcomeService {
  constructor(private readonly notification: NotificationService) {}

  async sendWelcome(email: string, phone: string, telegramId: number) {
    const result = await this.notification.send({
      email: {
        to: email,
        subject: 'Welcome!',
        body: '<h1>Welcome to our app</h1>',
      },
      sms: {
        to: phone,
        body: 'Welcome to our app!',
      },
      telegram: {
        chatId: telegramId,
        text: 'Welcome to our app!',
      },
    });

    console.log(`Sent via ${result.channels.length} channels`);
  }
}
```

Use [`notificationService.enqueue()`](#queue-support) instead of `.send()` to defer processing via Bull/BullMQ.

---

## Channels & Providers

| Channel     | Providers                                             |
| ----------- | ----------------------------------------------------- |
| Email       | SendGrid, Google SMTP, Mailgun, AWS SES, Generic SMTP |
| SMS         | Twilio, Vonage, AWS SNS                               |
| Push        | Firebase Cloud Messaging, APNs                        |
| Telegram    | Telegram Bot API                                      |
| Slack       | Slack Web API / Webhooks                              |
| Teams       | Microsoft Teams Incoming Webhooks (MessageCard)       |
| Google Chat | Google Chat Incoming Webhooks (text + cards)          |

### Usage by channel

Register providers in `NotificationModule.forRoot()` (or [`forRootAsync()`](#async-configuration)). Pass input to `notificationService.send()` — all available fields are defined in the corresponding input type (`EmailSendInput`, `SmsSendInput`, etc.) at [`notification.types.ts`](https://github.com/os-io/nest-kit/blob/main/packages/infra/notification/notification.types.ts).

:::tabs

== Email

Type: [`EmailSendInput`](https://github.com/os-io/nest-kit/blob/main/packages/infra/notification/notification.types.ts#L26-L36) — 5 providers

```typescript
import {
  SendGridEmailProvider,
  GoogleEmailProvider,
  MailgunEmailProvider,
  SesEmailProvider,
  SmtpEmailProvider,
} from '@os.io/nest-kit/infra/notification/providers';

// SendGrid
new SendGridEmailProvider({ apiKey: 'SG.xxx', defaultFrom: 'noreply@example.com' });

// Google SMTP
new GoogleEmailProvider({ user: 'user@gmail.com', pass: 'app-password' });

// Mailgun
new MailgunEmailProvider({ apiKey: 'key-xxx', domain: 'mg.example.com' });

// AWS SES
new SesEmailProvider({ region: 'us-east-1', accessKeyId: 'AKIxxx', secretAccessKey: 'xxx' });

// Generic SMTP
new SmtpEmailProvider({ host: 'smtp.example.com', port: 587, user: 'user', pass: 'pass' });
```

== SMS

Type: [`SmsSendInput`](https://github.com/os-io/nest-kit/blob/main/packages/infra/notification/notification.types.ts#L38-L42) — 3 providers

```typescript
import {
  TwilioSmsProvider,
  VonageSmsProvider,
  SnsSmsProvider,
} from '@os.io/nest-kit/infra/notification/providers';

// Twilio
new TwilioSmsProvider({ accountSid: 'ACxxx', authToken: 'xxx', from: '+1234567890' });

// Vonage
new VonageSmsProvider({ apiKey: 'xxx', apiSecret: 'xxx', from: 'MyApp' });

// AWS SNS
new SnsSmsProvider({ region: 'us-east-1', accessKeyId: 'AKIxxx', secretAccessKey: 'xxx' });
```

== Push

Type: [`PushSendInput`](https://github.com/os-io/nest-kit/blob/main/packages/infra/notification/notification.types.ts#L44-L52) — 2 providers

```typescript
import {
  FirebasePushProvider,
  ApnsPushProvider,
} from '@os.io/nest-kit/infra/notification/providers';

// Firebase
new FirebasePushProvider({ serviceAccount: require('./firebase-credentials.json') });
```

== Telegram

Type: [`TelegramSendInput`](https://github.com/os-io/nest-kit/blob/main/packages/infra/notification/notification.types.ts#L54-L61) — 1 provider. Uses `node-telegram-bot-api`.

```typescript
import { TelegramProvider } from '@os.io/nest-kit/infra/notification/providers';

new TelegramProvider({ botToken: '123456:ABC-DEF' });
```

== Slack

Type: [`SlackSendInput`](https://github.com/os-io/nest-kit/blob/main/packages/infra/notification/notification.types.ts#L63-L69) — 1 provider.

```typescript
import { SlackProvider } from '@os.io/nest-kit/infra/notification/providers';

// Bot token mode
new SlackProvider({ botToken: 'xoxb-xxx' });
// Webhook mode
new SlackProvider({ webhookUrl: 'https://hooks.slack.com/services/xxx' });
```

== Teams

Type: [`TeamsSendInput`](https://github.com/os-io/nest-kit/blob/main/packages/infra/notification/notification.types.ts#L71-L84) — 1 provider. Uses built-in `fetch`.

Sends [MessageCard](https://learn.microsoft.com/en-us/outlook/actionable-messages/message-card-reference) payloads. No additional dependencies.

```typescript
import { TeamsProvider } from '@os.io/nest-kit/infra/notification/providers';

const result = await notificationService.send({
  teams: {
    webhookUrl: 'https://outlook.office.com/webhook/xxx',
    title: 'Deploy finished',
    text: 'v2.1.0 deployed to production',
    themeColor: '0078D4',
    sections: [
      {
        activityTitle: 'CI Pipeline',
        facts: [
          { name: 'Branch', value: 'main' },
          { name: 'Commit', value: 'abc123' },
        ],
      },
    ],
  },
});
```

== Google Chat

Type: [`GoogleChatSendInput`](https://github.com/os-io/nest-kit/blob/main/packages/infra/notification/notification.types.ts#L86-L103) — 1 provider. Uses built-in `fetch`.

Sends text + [interactive cards](https://developers.google.com/chat/how-tos/webhooks).

```typescript
import { GoogleChatProvider } from '@os.io/nest-kit/infra/notification/providers';

const result = await notificationService.send({
  googlechat: {
    webhookUrl: 'https://chat.googleapis.com/v1/spaces/xxx/messages?key=xxx&token=xxx',
    text: 'Deploy finished: v2.1.0 is live!',
    threadKey: 'deploy-thread',
    cards: [
      {
        header: { title: 'CI/CD Pipeline' },
        sections: [
          {
            widgets: [{ textParagraph: { text: 'Build <b>#123</b> passed' } }],
          },
        ],
      },
    ],
  },
});
```

:::

---

## Queue support

Enable Bull/BullMQ to process notifications asynchronously:

```typescript
import Bull from 'bull';

@Module({
  imports: [
    NotificationModule.forRoot({
      providers: {/* ... */},
      queue: {
        enabled: true,
        bull: new Bull('notifications', { redis: { host: 'localhost' } }),
      },
    }),
  ],
})
export class AppModule {}
```

Then enqueue instead of sending directly:

```typescript
await notificationService.enqueue({
  email: { to: 'user@example.com', subject: 'Hi', body: '...' },
  sms: { to: '+1234567890', body: '...' },
});
```

---

## Storage & Status Tracking

Enable persistence to save notification records and query status:

```typescript
import { TypeOrmNotificationStore } from '@os.io/nest-kit/infra/notification/stores';
import { NotificationLogEntity } from '@os.io/nest-kit/infra/notification';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationLogEntity]),
    NotificationModule.forRoot({
      providers: { /* ... */ },
      storage: {
        enabled: true,
        store: new TypeOrmNotificationStore(repository),
      },
    }),
  ],
})
```

Query status later:

```typescript
const record = await notificationService.getStatus('uuid-xxx');
console.log(record.status); // 'sent' | 'partial' | 'failed'
```

---

## Async Configuration

```typescript
NotificationModule.forRootAsync({
  useFactory: (config: ConfigService) => ({
    providers: {
      email: [
        new SmtpEmailProvider({
          host: config.get('SMTP_HOST'),
          port: config.get('SMTP_PORT'),
          user: config.get('SMTP_USER'),
          pass: config.get('SMTP_PASS'),
        }),
      ],
    },
    queue: { enabled: config.get('NOTIFICATION_QUEUE_ENABLED') },
    storage: { enabled: config.get('NOTIFICATION_STORAGE_ENABLED') },
  }),
  inject: [ConfigService],
});
```

---

## Comparison with nesthub

| Feature                    | nesthub/notification | `@os.io/nest-kit/infra/notification` |
| -------------------------- | -------------------- | ------------------------------------ |
| Email (SMTP)               | ✅                   | ✅ (5 providers)                     |
| SMS (Twilio)               | ✅                   | ✅ (3 providers)                     |
| Firebase (FCM)             | ✅                   | ✅ + APNs                            |
| Telegram                   | ✅                   | ✅                                   |
| Slack                      | ❌                   | ✅                                   |
| Teams                      | ❌                   | ✅ (MessageCard webhooks)            |
| Google Chat                | ❌                   | ✅ (text + cards webhooks)           |
| BullMQ queue               | ✅                   | ✅ (Bull compatible)                 |
| TypeORM persistence        | ✅                   | ✅ (Memory + TypeORM)                |
| Template engine            | ✅ (Handlebars)      | ⚠️ Passthrough (bring your renderer) |
| Multiple providers/channel | ❌ (failover chain)  | ✅ Parallel or sequential            |
| Sub-path imports           | ❌                   | ✅ `providers` + `stores`            |
