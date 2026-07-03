# Notification — `@os.io/nest-kit/infra/notification`

Multi-channel notification module for NestJS with 12+ providers, parallel sending, queue support, and optional persistence.

## Features

- **7 channels**: Email, SMS, Push, Telegram, Slack, Teams, Google Chat
- **14+ providers**: SendGrid, Google SMTP, Mailgun, SES, SMTP, Twilio, Vonage, SNS, Firebase, APNs, Telegram, Slack, Teams, Google Chat
- **Parallel sending**: Fire multiple providers simultaneously
- **Queue support**: Optional Bull/BullMQ (enqueue → async)
- **Persistence**: Optional store with status tracking (TypeORM, Memory)
- **Optional deps**: Only install the providers you use

## Quick Start

```typescript
import { Module } from '@nestjs/common';
import { NotificationModule } from '@os.io/nest-kit/infra/notification';
import { SmtpEmailProvider, TwilioSmsProvider } from '@os.io/nest-kit/infra/notification/providers';
import { MemoryNotificationStore } from '@os.io/nest-kit/infra/notification/stores';

@Module({
  imports: [
    NotificationModule.forRoot({
      providers: {
        email: [
          new SmtpEmailProvider({
            host: 'smtp.example.com',
            port: 587,
            defaultFrom: 'noreply@ex.com',
          }),
        ],
        sms: [new TwilioSmsProvider({ accountSid: '...', authToken: '...', from: '+1234567890' })],
      },
      storage: { enabled: true, store: new MemoryNotificationStore() },
      parallel: true,
    }),
  ],
})
export class AppModule {}
```

## Sending notifications

```typescript
import { NotificationService } from '@os.io/nest-kit/infra/notification';

@Injectable()
export class MyService {
  constructor(private readonly notification: NotificationService) {}

  async notify() {
    const result = await this.notification.send({
      email: { to: 'user@ex.com', subject: 'Hi', body: '<h1>Hello</h1>' },
      sms: { to: '+1234567890', body: 'Hello!' },
    });
  }
}
```

## Available providers

### Email

| Provider     | Class                   | Peer dep              |
| ------------ | ----------------------- | --------------------- |
| SendGrid     | `SendGridEmailProvider` | `@sendgrid/mail`      |
| Google SMTP  | `GoogleEmailProvider`   | `nodemailer`          |
| Mailgun      | `MailgunEmailProvider`  | `form-data`           |
| AWS SES      | `SesEmailProvider`      | `@aws-sdk/client-ses` |
| Generic SMTP | `SmtpEmailProvider`     | `nodemailer`          |

### SMS

| Provider | Class               | Peer dep              |
| -------- | ------------------- | --------------------- |
| Twilio   | `TwilioSmsProvider` | `twilio`              |
| Vonage   | `VonageSmsProvider` | `@vonage/server-sdk`  |
| AWS SNS  | `SnsSmsProvider`    | `@aws-sdk/client-sns` |

### Push

| Provider                 | Class                  | Peer dep          |
| ------------------------ | ---------------------- | ----------------- |
| Firebase Cloud Messaging | `FirebasePushProvider` | `firebase-admin`  |
| APNs                     | `ApnsPushProvider`     | `@parse/node-apn` |

### Messenger

| Provider        | Class                | Peer dep                             |
| --------------- | -------------------- | ------------------------------------ |
| Telegram        | `TelegramProvider`   | `node-telegram-bot-api`              |
| Slack           | `SlackProvider`      | `@slack/web-api` or `@slack/webhook` |
| Microsoft Teams | `TeamsProvider`      | `fetch` (built-in)                   |
| Google Chat     | `GoogleChatProvider` | `fetch` (built-in)                   |

## Queue

```typescript
import Bull from 'bull';

NotificationModule.forRoot({
  providers: {/* ... */},
  queue: { enabled: true, bull: new Bull('notifications') },
});
```

```typescript
await notificationService.enqueue({ email: { to: 'user@ex.com', subject: 'Hi', body: '...' } });
```

## Storage

```typescript
import { TypeOrmNotificationStore } from '@os.io/nest-kit/infra/notification/stores';

const store = new TypeOrmNotificationStore(repository);

NotificationModule.forRoot({
  providers: {/* ... */},
  storage: { enabled: true, store },
});
```

```typescript
const record = await notificationService.getStatus('uuid-xxx');
```
