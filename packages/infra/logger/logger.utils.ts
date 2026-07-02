/** Module shape returned by `import('pino')`. */
export interface PinoModule {
  default: (...args: unknown[]) => any;
  transport: (options: {
    targets: {
      target: string;
      options?: Record<string, unknown>;
      level?: string;
    }[];
  }) => any;
}

let cached: PinoModule | null = null;

/**
 * Lazily import the `pino` peer dependency.
 * Throws a helpful message when `pino` is not installed.
 */
export async function loadPino(): Promise<PinoModule> {
  if (cached) return cached;
  try {
    const mod = await import('pino');
    cached = mod as unknown as PinoModule;
    return cached;
  } catch {
    throw new Error(
      [
        'Cannot find module "pino".',
        'Install the optional peer dependency:',
        '',
        '  npm install pino',
        '',
        'For pretty-print in development, also install:',
        '',
        '  npm install pino-pretty',
      ].join('\n'),
    );
  }
}
