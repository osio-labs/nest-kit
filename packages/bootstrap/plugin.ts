/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const BOOTSTRAP_PLUGINS = Symbol('BOOTSTRAP_PLUGINS');

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NestModule {
  forRoot?(config: Record<string, unknown>): unknown;
  forRootAsync?(opts: Record<string, unknown>): unknown;
  register?(config: Record<string, unknown>): unknown;
  registerAsync?(opts: Record<string, unknown>): unknown;
}

/**
 * Metadata defining a bootstrap plugin.
 */
export interface PluginMeta {
  /** Unique plugin name (used as key in useFactory map). */
  name: string;

  /** Module class with `forRoot`/`register` or `forRootAsync`/`registerAsync`. */
  readonly module?: NestModule;

  /**
   * Async loader — called once to resolve the module.
   * Takes priority over `module` when set.
   */
  load?: () => Promise<NestModule>;
}

/**
 * A plugin instance bound to an optional config object.
 */
export interface PluginInstance {
  meta: PluginMeta;
  config?: any;
}

export type PluginInput = string | PluginInstance | Record<string, any>;

/* ------------------------------------------------------------------ */
/*  definePlugin                                                       */
/* ------------------------------------------------------------------ */

/**
 * Define a bootstrap plugin.
 *
 * @example
 * ```ts
 * const myPlugin = definePlugin({ name: 'myPlugin', module: MyModule });
 * BootstrapModule.forRoot([myPlugin.with({ key: 'val' })]);
 * ```
 */
export function definePlugin(meta: PluginMeta) {
  return {
    ...meta,
    with: (config?: unknown): PluginInstance => ({ meta, config }),
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function resolveModule(instance: PluginInstance): Promise<NestModule | undefined> {
  if (instance.meta.load) return instance.meta.load();
  return instance.meta.module;
}

/* ------------------------------------------------------------------ */
/*  Built-in plugins                                                   */
/* ------------------------------------------------------------------ */

/** TypeORM plugin — wraps `TypeOrmModule.forRoot` / `forRootAsync`. */
export const typeormPlugin = definePlugin({
  name: 'typeorm',
  async load() {
    try {
      const { TypeOrmModule } = await import('@nestjs/typeorm');
      return TypeOrmModule;
    } catch {
      throw new Error(
        '[@os.io/nest-kit] @nestjs/typeorm is required when using the typeorm plugin. ' +
          'Install: npm install @nestjs/typeorm typeorm',
      );
    }
  },
});

/** Cache plugin — wraps `CacheModule.register` / `registerAsync`. */
export const cachePlugin = definePlugin({
  name: 'cache',
  async load() {
    try {
      // @ts-expect-error optional peer dep
      const mod = (await import('@nestjs/cache-manager')) as Record<string, NestModule>;
      return mod.CacheModule;
    } catch {
      throw new Error(
        '[@os.io/nest-kit] @nestjs/cache-manager is required when using the cache plugin. ' +
          'Install: npm install @nestjs/cache-manager cache-manager keyv',
      );
    }
  },
});

/** BullMQ queue plugin — wraps `BullModule.forRoot` / `forRootAsync`. */
export const queuePlugin = definePlugin({
  name: 'queue',
  async load() {
    try {
      // @ts-expect-error optional peer dep
      const mod = (await import('@nestjs/bullmq')) as Record<string, NestModule>;
      return mod.BullModule;
    } catch {
      throw new Error(
        '[@os.io/nest-kit] @nestjs/bullmq is required when using the queue plugin. ' +
          'Install: npm install @nestjs/bullmq bullmq',
      );
    }
  },
});

/* ------------------------------------------------------------------ */
/*  Plugin resolution                                                  */
/* ------------------------------------------------------------------ */

const _builtins = new Map<string, ReturnType<typeof definePlugin>>([
  ['typeorm', typeormPlugin],
  ['cache', cachePlugin],
  ['queue', queuePlugin],
]);

/**
 * Register a custom plugin so it can be referenced by shorthand string.
 */
export function registerPlugin(plugin: ReturnType<typeof definePlugin>): void {
  _builtins.set(plugin.name, plugin);
}

/**
 * Resolve an array of plugin inputs to `PluginInstance[]`.
 *
 * Accepts three forms:
 * - `'typeorm'` — looks up the built-in registry
 * - `typeormPlugin.with({...})` — explicit `PluginInstance`
 * - `{ name: 'typeorm', ... }` — object shorthand (spread as config)
 */
export function resolvePlugins(input: PluginInput[]): PluginInstance[] {
  return input.map((i) => {
    if (typeof i === 'string') {
      const p = _builtins.get(i);
      if (!p) throw new Error(`[@os.io/nest-kit] Unknown plugin "${i}"`);
      return p.with();
    }

    if ('meta' in i && 'config' in i) return i as PluginInstance;

    const { name, ...config } = i as Record<string, any>;
    const p = _builtins.get(name as string);
    if (!p) throw new Error(`[@os.io/nest-kit] Unknown plugin "${name}"`);
    return p.with(Object.keys(config).length ? config : undefined);
  });
}

/**
 * Resolve all plugin modules (async).
 */
type Resolved = { instance: PluginInstance; module: NestModule };

export async function resolvePluginModules(
  items: PluginInstance[],
): Promise<Array<Resolved | null>> {
  return Promise.all(
    items.map(async (i) => {
      try {
        const mod = await resolveModule(i);
        return mod ? { instance: i, module: mod } : null;
      } catch {
        return null;
      }
    }),
  );
}
