import { type DynamicModule, type Provider, type InjectionToken, Module } from '@nestjs/common';
import {
  WEBHOOK_MODULE_OPTIONS,
  OUTGOING_WEBHOOK_OPTIONS,
  INCOMING_WEBHOOK_OPTIONS,
  WEBHOOK_EVENT_BUS,
  WEBHOOK_CIRCUIT_BREAKER,
  WEBHOOK_DELIVERY_STORE,
  INCOMING_WEBHOOK_ADAPTERS,
  INCOMING_WEBHOOK_HANDLERS,
} from './webhook.constants.js';
import type {
  WebhookModuleOptions,
  WebhookModuleAsyncOptions,
  OutgoingWebhookOptions,
  IncomingWebhookModuleOptions,
  WebhookDeliveryStore,
} from './webhook.types.js';
import { WebhookEventBus } from './event-bus.js';
import { WebhookCircuitBreaker } from './circuit-breaker.js';
import { OutgoingWebhookService } from './outgoing/outgoing-webhook.service.js';
import { IncomingWebhookController } from './incoming/incoming-webhook.controller.js';
import { IncomingWebhookService } from './incoming/incoming-webhook.service.js';

/**
 * NestJS DynamicModule for webhook handling — both incoming and outgoing.
 *
 * Provides:
 * - Outgoing webhook delivery with exponential backoff retry
 * - HMAC signature verification for incoming and signing for outgoing
 * - In-memory event bus for decoupled emission
 * - Circuit breaker to stop hammering dead URLs
 * - Optional BullMQ queue integration
 * - Optional TypeORM / custom store for delivery logs
 * - Auto-registered incoming webhook controller with signature verification
 *
 * @example
 * ```typescript
 * import { WebhookModule } from '@os.io/nest-kit/infra/webhook';
 *
 * @Module({
 *   imports: [
 *     WebhookModule.forRoot({
 *       outgoing: { signingSecret: 'my-secret' },
 *       incoming: { secret: 'my-verify-secret' },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class WebhookModule {
  static forRoot(options: WebhookModuleOptions): DynamicModule {
    const providers = WebhookModule.createSharedProviders(options);

    const controllers = options.incoming ? [IncomingWebhookController] : [];

    return {
      module: WebhookModule,
      global: options.global ?? true,
      providers,
      controllers,
      exports: [
        OutgoingWebhookService,
        IncomingWebhookService,
        WebhookEventBus,
        WebhookCircuitBreaker,
      ],
    };
  }

  static forRootAsync(options: WebhookModuleAsyncOptions): DynamicModule {
    return {
      module: WebhookModule,
      global: options.global ?? true,
      imports: (options.imports as DynamicModule['imports']) ?? [],
      providers: WebhookModule.createAsyncProviders(options),
      controllers: [IncomingWebhookController],
      exports: [
        OutgoingWebhookService,
        IncomingWebhookService,
        WebhookEventBus,
        WebhookCircuitBreaker,
      ],
    };
  }

  private static createSharedProviders(options: WebhookModuleOptions): Provider[] {
    const providers: Provider[] = [];

    providers.push({ provide: WEBHOOK_MODULE_OPTIONS, useValue: options });

    providers.push({
      provide: OUTGOING_WEBHOOK_OPTIONS,
      useValue: options.outgoing ?? ({} as OutgoingWebhookOptions),
    });

    providers.push({
      provide: INCOMING_WEBHOOK_OPTIONS,
      useValue: options.incoming ?? ({} as IncomingWebhookModuleOptions),
    });

    providers.push(WebhookEventBus);
    providers.push({
      provide: WEBHOOK_EVENT_BUS,
      useExisting: WebhookEventBus,
    });

    providers.push({
      provide: WebhookCircuitBreaker,
      useFactory: () => new WebhookCircuitBreaker(options.circuitBreaker),
    });

    providers.push({
      provide: WEBHOOK_CIRCUIT_BREAKER,
      useExisting: WebhookCircuitBreaker,
    });

    if (options.storage?.enabled && options.storage.store) {
      providers.push({
        provide: WEBHOOK_DELIVERY_STORE,
        useValue: options.storage.store,
      });
    }

    if (options.incoming?.adapters && options.incoming.adapters.length > 0) {
      providers.push({
        provide: INCOMING_WEBHOOK_ADAPTERS,
        useValue: options.incoming.adapters,
      });
    }

    if (options.incoming?.handlers && options.incoming.handlers.length > 0) {
      providers.push({
        provide: INCOMING_WEBHOOK_HANDLERS,
        useValue: options.incoming.handlers,
      });
    }

    if (options.outgoing) {
      providers.push(OutgoingWebhookService);
    }

    if (options.incoming) {
      providers.push(IncomingWebhookService);
    }

    return providers;
  }

  private static createAsyncProviders(options: WebhookModuleAsyncOptions): Provider[] {
    return [
      {
        provide: WEBHOOK_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: (options.inject ?? []) as InjectionToken[],
      },
      {
        provide: OUTGOING_WEBHOOK_OPTIONS,
        useFactory: (opts: WebhookModuleOptions) => opts.outgoing ?? ({} as OutgoingWebhookOptions),
        inject: [WEBHOOK_MODULE_OPTIONS],
      },
      {
        provide: INCOMING_WEBHOOK_OPTIONS,
        useFactory: (opts: WebhookModuleOptions) =>
          opts.incoming ?? ({} as IncomingWebhookModuleOptions),
        inject: [WEBHOOK_MODULE_OPTIONS],
      },
      WebhookEventBus,
      {
        provide: WEBHOOK_EVENT_BUS,
        useExisting: WebhookEventBus,
      },
      {
        provide: WebhookCircuitBreaker,
        useFactory: (opts: WebhookModuleOptions) => new WebhookCircuitBreaker(opts.circuitBreaker),
        inject: [WEBHOOK_MODULE_OPTIONS],
      },
      {
        provide: WEBHOOK_CIRCUIT_BREAKER,
        useExisting: WebhookCircuitBreaker,
      },
      {
        provide: WEBHOOK_DELIVERY_STORE,
        useFactory: (opts: WebhookModuleOptions) => {
          if (opts.storage?.enabled && opts.storage.store) {
            return opts.storage.store;
          }
          return undefined;
        },
        inject: [WEBHOOK_MODULE_OPTIONS],
      },
      {
        provide: INCOMING_WEBHOOK_ADAPTERS,
        useFactory: (opts: WebhookModuleOptions) => opts.incoming?.adapters ?? [],
        inject: [WEBHOOK_MODULE_OPTIONS],
      },
      {
        provide: INCOMING_WEBHOOK_HANDLERS,
        useFactory: (opts: WebhookModuleOptions) => opts.incoming?.handlers ?? [],
        inject: [WEBHOOK_MODULE_OPTIONS],
      },
      {
        provide: OutgoingWebhookService,
        useFactory: (
          outgoingOpts: OutgoingWebhookOptions,
          eventBus: WebhookEventBus,
          circuitBreaker: WebhookCircuitBreaker,
          store?: WebhookDeliveryStore,
        ) => new OutgoingWebhookService(outgoingOpts, eventBus, circuitBreaker, store),
        inject: [
          OUTGOING_WEBHOOK_OPTIONS,
          WEBHOOK_EVENT_BUS,
          WEBHOOK_CIRCUIT_BREAKER,
          { token: WEBHOOK_DELIVERY_STORE, optional: true },
        ],
      },
      {
        provide: IncomingWebhookService,
        useFactory: (incomingOpts: IncomingWebhookModuleOptions, eventBus: WebhookEventBus) =>
          new IncomingWebhookService(incomingOpts, eventBus),
        inject: [INCOMING_WEBHOOK_OPTIONS, WEBHOOK_EVENT_BUS],
      },
    ];
  }
}
