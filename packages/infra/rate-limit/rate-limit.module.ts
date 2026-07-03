import { type DynamicModule, type Provider, Module } from '@nestjs/common';
import { RATE_LIMIT_MODULE_OPTIONS, RATE_LIMIT_ADAPTER } from './rate-limit.constants';
import { RateLimitService } from './rate-limit.service';
import { RateLimitGuard } from './rate-limit.guard';
import type { RateLimitModuleOptions, RateLimitModuleAsyncOptions } from './rate-limit.types';

@Module({})
export class RateLimitModule {
  static forRoot(options: RateLimitModuleOptions): DynamicModule {
    const providers: Provider[] = [
      { provide: RATE_LIMIT_MODULE_OPTIONS, useValue: options },
      { provide: RATE_LIMIT_ADAPTER, useValue: options.adapter },
      RateLimitService,
      RateLimitGuard,
    ];

    return {
      module: RateLimitModule,
      global: options.global ?? true,
      providers,
      exports: [RateLimitService, RateLimitGuard],
    };
  }

  static forRootAsync(options: RateLimitModuleAsyncOptions): DynamicModule {
    return {
      module: RateLimitModule,
      global: options.global ?? true,
      imports: options.imports ?? [],
      providers: [...this.createAsyncProviders(options), RateLimitService, RateLimitGuard],
      exports: [RateLimitService, RateLimitGuard],
    };
  }

  private static createAsyncProviders(options: RateLimitModuleAsyncOptions): Provider[] {
    return [
      {
        provide: RATE_LIMIT_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      },
      {
        provide: RATE_LIMIT_ADAPTER,
        useFactory: (opts: RateLimitModuleOptions) => {
          if (!opts.adapter) {
            throw new Error(
              'RateLimitModule requires an adapter. Provide one via options.adapter.',
            );
          }
          return opts.adapter;
        },
        inject: [RATE_LIMIT_MODULE_OPTIONS],
      },
    ];
  }
}
