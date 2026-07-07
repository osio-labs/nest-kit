import { Module, type DynamicModule } from '@nestjs/common';
import {
  BOOTSTRAP_PLUGINS,
  type PluginInput,
  resolvePlugins,
  resolvePluginModules,
} from './plugin';

/**
 * Central bootstrap module for NestJS applications.
 *
 * Register via `BootstrapModule.forRoot()` or `BootstrapModule.forRootAsync()`
 * in your `AppModule` imports.
 *
 * **Built-in plugins:**
 * - `typeorm` — `@nestjs/typeorm`
 * - `cache`  — `@nestjs/cache-manager`
 * - `queue`  — `@nestjs/bullmq`
 * - `sentry` — `@sentry/nestjs`
 *
 * @example
 * ```ts
 * // app.module.ts
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot(),
 *     await BootstrapModule.forRoot(['typeorm', 'cache', 'queue']),
 *   ],
 * })
 * export class AppModule {}
 *
 * // main.ts
 * const app = await NestFactory.create(AppModule);
 * configOpenApi(app, { title: 'My API' });
 * await app.listen(3000);
 * ```
 */
@Module({})
export class BootstrapModule {
  /**
   * Register plugins with **sync** configuration.
   *
   * Accepts two forms:
   * - **Array** — `PluginInput[]` (strings, `{ name, ...config }`, or `PluginInstance`)
   * - **Object** — `Record<string, any>` where keys are plugin names and values are configs
   *
   * @param plugins - Plugin input (array or object form).
   *
   * @example
   * ```ts
   * // Array form
   * await BootstrapModule.forRoot(['typeorm', 'cache'])
   * await BootstrapModule.forRoot([{ name: 'typeorm' }, { name: 'cache', config: { queues: [...] } }])
   *
   * // Object form
   * await BootstrapModule.forRoot({
   *   typeorm: {},
   *   cache: { queues: [{ name: 'email' }] },
   * })
   * ```
   */
  static async forRoot(plugins: PluginInput[] | Record<string, any>): Promise<DynamicModule> {
    const normalized: PluginInput[] = Array.isArray(plugins)
      ? (plugins as PluginInput[])
      : Object.entries(plugins).map(([name, config]): PluginInput => {
          if (config && typeof config === 'object') return { name, ...config } as PluginInput;
          return name;
        });

    const items = resolvePlugins(normalized);
    const resolved = await resolvePluginModules(items);

    return {
      module: BootstrapModule,
      global: true,
      imports: resolved
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map(({ instance, module: mod }) => {
          const config = (instance.config ?? {}) as Record<string, unknown>;
          return (mod.forRoot?.(config) ?? mod.register?.(config)) as DynamicModule;
        }),
      providers: [{ provide: BOOTSTRAP_PLUGINS, useValue: items }],
    };
  }

  /**
   * Register plugins with **async** configuration via `ConfigService`.
   *
   * Accepts two forms for `plugins`:
   * - **Array** — strings (plugin names) or `{ name, config }` objects
   * - **Object** — keys are plugin names, values are factory functions or plain configs
   *
   * Factory functions receive injected services and return the plugin's config.
   * Plain config values are passed directly to `forRoot`/`register`.
   *
   * @param opts - `imports`, `inject`, and `plugins`.
   *
   * @example
   * ```ts
   * // Array form (shorthand)
   * await BootstrapModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   plugins: ['typeorm', 'cache', 'queue', 'swagger'],
   * })
   *
   * // Object form (per-plugin config)
   * await BootstrapModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   plugins: {
   *     typeorm: (cs) => configTypeOrm(undefined, cs),
   *     cache:   (cs) => configCache(undefined, cs),
   *     swagger: { title: 'My API' },
   *   },
   * })
   * ```
   */
  static async forRootAsync(opts: {
    imports?: any[];
    inject?: any[];
    plugins: string[] | { name: string; config?: any }[] | Record<string, any>;
  }): Promise<DynamicModule> {
    const pluginMap: Record<string, any> = {};
    if (Array.isArray(opts.plugins)) {
      (opts.plugins as (string | { name: string; config?: any })[]).forEach((p) => {
        if (typeof p === 'string') {
          pluginMap[p] = {};
        } else {
          const { name } = p;
          pluginMap[name] = (p.config as Record<string, unknown>) ?? {};
        }
      });
    } else {
      Object.assign(pluginMap, opts.plugins);
    }

    const items = resolvePlugins(Object.keys(pluginMap));
    const resolved = await resolvePluginModules(items);

    return {
      module: BootstrapModule,
      global: true,
      imports: [
        ...((opts.imports ?? []) as DynamicModule[]),
        ...resolved
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .map(({ instance, module: mod }) => {
            const entry = pluginMap[instance.meta.name] as
              Record<string, unknown> | ((...args: unknown[]) => Record<string, unknown>);

            if (typeof entry === 'function') {
              return (mod.forRootAsync?.({
                inject: opts.inject as unknown[],
                useFactory: entry,
              }) ??
                mod.registerAsync?.({
                  inject: opts.inject as unknown[],
                  useFactory: entry,
                })) as DynamicModule;
            }

            return (mod.forRoot?.(entry) ?? mod.register?.(entry)) as DynamicModule;
          }),
      ],
      providers: [{ provide: BOOTSTRAP_PLUGINS, useValue: items }],
    };
  }
}
