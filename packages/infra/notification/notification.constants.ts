import type { ProviderResult } from './notification.types';

export const NOTIFICATION_MODULE_OPTIONS = 'NOTIFICATION_MODULE_OPTIONS';
export const NOTIFICATION_QUEUE = 'NOTIFICATION_QUEUE';
export const NOTIFICATION_STORE = 'NOTIFICATION_STORE';

export interface NotificationProvider<T = unknown> {
  readonly name: string;
  readonly channel: string;
  send(message: T): Promise<ProviderResult>;
}
