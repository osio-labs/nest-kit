import type { NotificationProvider } from './notification.constants';

export type ChannelType = 'email' | 'sms' | 'push' | 'telegram' | 'slack' | 'teams' | 'googlechat';

export interface ProviderResult {
  success: boolean;
  providerName: string;
  channel: ChannelType;
  messageId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelResult {
  channel: ChannelType;
  results: ProviderResult[];
}

export interface NotificationResult {
  id?: string;
  success: boolean;
  channels: ChannelResult[];
  timestamp: Date;
}

export interface EmailSendInput {
  to: string | string[];
  subject: string;
  body: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  from?: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

export interface SmsSendInput {
  to: string;
  body: string;
  from?: string;
}

export interface PushSendInput {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  image?: string;
  badge?: number;
  sound?: string;
}

export interface TelegramSendInput {
  chatId: string | number;
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2';
  buttons?: Array<Array<{ text: string; url?: string; callbackData?: string }>>;
  photo?: string;
  document?: string;
}

export interface SlackSendInput {
  channel: string;
  text: string;
  blocks?: unknown[];
  attachments?: unknown[];
  threadTs?: string;
}

export interface TeamsSendInput {
  webhookUrl: string;
  title?: string;
  text: string;
  summary?: string;
  themeColor?: string;
  sections?: Array<{
    activityTitle?: string;
    activitySubtitle?: string;
    activityText?: string;
    facts?: Array<{ name: string; value: string }>;
    text?: string;
  }>;
}

export interface GoogleChatSendInput {
  webhookUrl: string;
  text: string;
  threadKey?: string;
  cards?: Array<{
    header?: { title?: string; subtitle?: string; imageUrl?: string };
    sections?: Array<{
      header?: string;
      widgets?: Array<{
        textParagraph?: { text: string };
        keyValue?: { topLabel?: string; content?: string; bottomLabel?: string };
        buttons?: Array<{
          textButton?: { text: string; onClick?: { openLink?: { url: string } } };
        }>;
      }>;
    }>;
  }>;
}

export interface SendInput {
  template?: string;
  templateData?: Record<string, unknown>;
  email?: EmailSendInput;
  sms?: SmsSendInput;
  push?: PushSendInput;
  telegram?: TelegramSendInput;
  slack?: SlackSendInput;
  teams?: TeamsSendInput;
  googlechat?: GoogleChatSendInput;
}

export interface NotificationRecord {
  id: string;
  channels: ChannelType[];
  status: 'pending' | 'sent' | 'partial' | 'failed';
  results: ChannelResult[];
  input: SendInput;
  createdAt: Date;
  updatedAt?: Date;
}

export interface NotificationStore {
  save(record: Omit<NotificationRecord, 'id' | 'createdAt'>): Promise<NotificationRecord>;
  findById(id: string): Promise<NotificationRecord | null>;
  findByChannel(channel: ChannelType, limit?: number): Promise<NotificationRecord[]>;
  updateStatus(id: string, status: NotificationRecord['status']): Promise<void>;
}

export interface NotificationModuleOptions {
  providers: {
    email?: NotificationProvider<EmailSendInput>[];
    sms?: NotificationProvider<SmsSendInput>[];
    push?: NotificationProvider<PushSendInput>[];
    telegram?: NotificationProvider<TelegramSendInput>[];
    slack?: NotificationProvider<SlackSendInput>[];
    teams?: NotificationProvider<TeamsSendInput>[];
    googlechat?: NotificationProvider<GoogleChatSendInput>[];
  };
  queue?: {
    enabled: boolean;
    bull?: unknown;
  };
  storage?: {
    enabled: boolean;
    store?: NotificationStore;
  };
  global?: boolean;
  defaultFrom?: {
    email?: string;
    sms?: string;
  };
  parallel?: boolean;
}

export interface NotificationModuleAsyncOptions {
  useFactory: (
    ...args: unknown[]
  ) => Promise<NotificationModuleOptions> | NotificationModuleOptions;
  inject?: unknown[];
  imports?: unknown[];
  global?: boolean;
}
