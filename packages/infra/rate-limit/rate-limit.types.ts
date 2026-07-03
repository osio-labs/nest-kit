export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  total: number;
}

export interface RateLimitAdapter {
  consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export interface RateLimitGuardOptions {
  limit?: number;
  windowSeconds?: number;
  keyGenerator?: (context: any) => string;
  errorMessage?: string;
}

export interface RateLimitModuleOptions {
  adapter: RateLimitAdapter;
  global?: boolean;
  defaultLimit?: number;
  defaultWindowSeconds?: number;
}

export interface RateLimitModuleAsyncOptions {
  useFactory: (...args: unknown[]) => Promise<RateLimitModuleOptions> | RateLimitModuleOptions;
  inject?: any[];
  imports?: any[];
  global?: boolean;
}
