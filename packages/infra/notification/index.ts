/**
 * @os.io/nest-kit/infra/notification
 *
 * Multi-channel notification module for NestJS. Supports email (SMTP,
 * SendGrid, SES), SMS (Twilio), push notifications (FCM, APNs), Telegram,
 * Slack, and in-app notifications.
 *
 * @module
 * @packageDocumentation
 */

export { NotificationModule } from './notification.module';
export { NotificationService } from './notification.service';
export type {
  ChannelType,
  ProviderResult,
  ChannelResult,
  NotificationResult,
  EmailSendInput,
  SmsSendInput,
  PushSendInput,
  TelegramSendInput,
  SlackSendInput,
  TeamsSendInput,
  GoogleChatSendInput,
  SendInput,
  NotificationRecord,
  NotificationStore,
  NotificationModuleOptions,
  NotificationModuleAsyncOptions,
} from './notification.types';
export {
  NOTIFICATION_MODULE_OPTIONS,
  NOTIFICATION_QUEUE,
  NOTIFICATION_STORE,
} from './notification.constants';
export { NotificationLogEntity } from './notification.entity';
export * from './providers';
export * from './stores';
