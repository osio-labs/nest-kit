import { Index, type IndexOptions } from 'typeorm';

export type HalfUniqueOptions = Omit<IndexOptions, 'unique'> & {
  synchronize?: boolean;
  nonNull?: string[];
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.every((i) => typeof i === 'string');
}

function asIndexOptions(opts?: HalfUniqueOptions): IndexOptions {
  const { nonNull, where, synchronize = false, ...rest } = opts ?? {};
  const whereParts: string[] = [where ?? 'deleted_at IS NULL'];

  if (nonNull?.length) {
    whereParts.push(...nonNull.map((col) => `${col} IS NOT NULL`));
  }

  return { unique: true, synchronize, where: whereParts.join(' AND '), ...rest } as IndexOptions;
}

export function HalfUnique(): ClassDecorator & PropertyDecorator;
export function HalfUnique(options: HalfUniqueOptions): ClassDecorator & PropertyDecorator;
export function HalfUnique(name: string): ClassDecorator & PropertyDecorator;
export function HalfUnique(
  name: string,
  options: HalfUniqueOptions,
): ClassDecorator & PropertyDecorator;
export function HalfUnique(
  name: string,
  columns: string[],
  options?: HalfUniqueOptions,
): ClassDecorator;
export function HalfUnique(columns: string[], options?: HalfUniqueOptions): ClassDecorator;
export function HalfUnique(...args: unknown[]): ClassDecorator & PropertyDecorator {
  if (args.length === 0) return Index(asIndexOptions());
  if (args.length === 1) {
    const [a] = args;
    if (isStringArray(a)) return Index(a, asIndexOptions());
    if (typeof a === 'string') return Index(a, asIndexOptions());
    return Index(asIndexOptions(a as HalfUniqueOptions));
  }
  if (args.length === 2) {
    const [a, b] = args as [string | string[], string[] | HalfUniqueOptions];
    if (typeof a === 'string' && isStringArray(b)) return Index(a, b, asIndexOptions());
    if (typeof a === 'string') return Index(a, asIndexOptions(b as HalfUniqueOptions));
    if (isStringArray(a)) return Index(a, asIndexOptions(b as HalfUniqueOptions));
  }
  if (args.length === 3) {
    const [a, b, c] = args;
    if (typeof a === 'string' && isStringArray(b))
      return Index(a, b, asIndexOptions(c as HalfUniqueOptions | undefined));
  }
  throw new Error('@HalfUnique: invalid arguments');
}
