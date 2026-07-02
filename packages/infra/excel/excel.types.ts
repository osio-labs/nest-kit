import { Writable } from 'node:stream';
import type { Column, Style } from 'exceljs';

/** Transform a cell value for display without mutating the source data. */
export type FormatterFn = (value: unknown, row: Record<string, unknown>) => unknown;

/**
 * Options for Excel export.
 *
 * Column and style types come directly from `exceljs`, giving you
 * full access to font, fill, alignment, border, number format, etc.
 */
export interface ExcelExportOptions {
  /** Name of the first / only worksheet (default 'Sheet1') */
  sheetName?: string;

  /**
   * Column definitions.
   * - `string[]` — key names only (auto-generated headers, widths)
   * - `Partial<Column>[]` — full exceljs Column objects
   *
   * When omitted, columns are auto-detected from the first object's keys.
   */
  columns?: string[] | Partial<Column>[];

  /** Style applied to the header row. Uses exceljs `Style` type. */
  headerStyle?: Partial<Style>;

  /** Enable auto-filter on the header row (default true) */
  useAutoFilter?: boolean;

  /**
   * Freeze panes, e.g. `'A2'` (freeze first row), `'B1'` (freeze first column),
   * `'B2'` (freeze first row + column).
   */
  freezePane?: string;

  /**
   * Global column formatters.
   * Keys match data field names; values transform the cell value for display.
   */
  formatters?: Record<string, FormatterFn>;

  /**
   * Column keys to exclude from the output.
   * Works with both auto-detected columns and explicit `columns` definitions.
   */
  excludeColumns?: string[];

  /** Document author */
  author?: string;

  /** Document creator (falls back to author) */
  createdBy?: string;
}

/**
 * Options for Excel import (parsing .xlsx → JSON).
 */
export interface ExcelImportOptions {
  /**
   * Sheet to read from.
   * - `number` — 0-based index (default 0)
   * - `string` — sheet name
   */
  sheet?: number | string;

  /**
   * Row number of the header (1-based).
   * - `0` — no header, returns arrays of arrays
   * - `1` — first row is header (default)
   */
  headerRow?: number;

  /** Skip empty rows. Default true. */
  skipEmpty?: boolean;

  /** Trim string values. Default true. */
  trim?: boolean;
}

/**
 * Minimal writable response with headers (Express Response compatible).
 *
 * @example
 * ```typescript
 * import { Response } from 'express';
 *
 * async function download(res: Response) {
 *   await exportToResponse(data, res, 'report.xlsx');
 * }
 * ```
 */
export type ExportResponse = Writable & {
  setHeader(name: string, value: string): void;
};
