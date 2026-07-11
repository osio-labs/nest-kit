export type { HalfUniqueOptions } from './half-unique.decorator.js';
export type { MoneyOptions } from './money.decorator.js';
export type { SlugOptions } from './slug.decorator.js';
export type { UniqueCodeOptions } from './unique-code.decorator.js';
export type { SequenceIdOptions } from './sequence-id.decorator.js';
export type { EmailOptions } from './email.decorator.js';
export type { PhoneOptions } from './phone.decorator.js';
export type { UrlOptions } from './url.decorator.js';
export type { TextOptions } from './text.decorator.js';
export type { JsonOptions } from './json.decorator.js';
export type { BooleanOptions } from './boolean.decorator.js';
export type { TimestampOptions } from './timestamp.decorator.js';

let _deco: Record<string, unknown> = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('typeorm');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _deco = require('./half-unique.decorator.js') as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sd = require('./soft-delete.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, sd);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const md = require('./money.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, md);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sl = require('./slug.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, sl);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const uc = require('./unique-code.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, uc);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sq = require('./sequence-id.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, sq);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const em = require('./email.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, em);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ph = require('./phone.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, ph);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ur = require('./url.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, ur);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tx = require('./text.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, tx);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const js = require('./json.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, js);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bl = require('./boolean.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, bl);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ts = require('./timestamp.decorator.js') as Record<string, unknown>;
  Object.assign(_deco, ts);
} catch {
  /* typeorm not installed — decorators will be undefined */
}

export const HalfUnique =
  _deco.HalfUnique as (typeof import('./half-unique.decorator.js'))['HalfUnique'];

export const SoftDelete =
  _deco.SoftDelete as (typeof import('./soft-delete.decorator.js'))['SoftDelete'];

export const Money = _deco.Money as (typeof import('./money.decorator.js'))['Money'];

export const Slug = _deco.Slug as (typeof import('./slug.decorator.js'))['Slug'];

export const UniqueCode =
  _deco.UniqueCode as (typeof import('./unique-code.decorator.js'))['UniqueCode'];

export const SequenceId =
  _deco.SequenceId as (typeof import('./sequence-id.decorator.js'))['SequenceId'];

export const Email = _deco.Email as (typeof import('./email.decorator.js'))['Email'];

export const Phone = _deco.Phone as (typeof import('./phone.decorator.js'))['Phone'];

export const Url = _deco.Url as (typeof import('./url.decorator.js'))['Url'];

export const Text = _deco.Text as (typeof import('./text.decorator.js'))['Text'];

export const Json = _deco.Json as (typeof import('./json.decorator.js'))['Json'];

export const Boolean = _deco.Boolean as (typeof import('./boolean.decorator.js'))['Boolean'];

export const CreatedAt =
  _deco.CreatedAt as (typeof import('./timestamp.decorator.js'))['CreatedAt'];

export const UpdatedAt =
  _deco.UpdatedAt as (typeof import('./timestamp.decorator.js'))['UpdatedAt'];

export const DeletedAt =
  _deco.DeletedAt as (typeof import('./timestamp.decorator.js'))['DeletedAt'];

/* DataSource registry — no typeorm dependency needed */
export { useDataSource } from './registry.js';
