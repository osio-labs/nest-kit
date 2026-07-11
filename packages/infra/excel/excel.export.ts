import { PassThrough } from 'node:stream';
import type { Row, Cell, Column, Style, Workbook } from 'exceljs';
import { loadExcel } from './excel.utils.js';
import type { ExcelExportOptions, ExportResponse } from './excel.types.js';

// ──────── Internal types ────────

interface SheetEntry {
  name: string;
  data: Record<string, unknown>[];
  columns?: string[] | Partial<Column>[];
}

// ──────── Defaults ────────

const DEFAULT_HEADER: Partial<Style> = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
  },
};

// ──────── Workbook (raw wrapper) ────────

/**
 * A generated Excel workbook.
 *
 * Returned by `buildWorkbook()`, `createBuilder()`, and the
 * convenience functions. Call one of the output methods to
 * materialise the file:
 *
 * - `toBuffer()`  → Node.js Buffer (S3, MinIO, API response, …)
 * - `toFile(path)` → write to disk
 * - `toStream()` → readable PassThrough stream
 * - `toBase64()` → base64-encoded string
 */
export class ExcelWorkbook {
  constructor(private readonly workbook: Workbook) {}

  /** Write the workbook to a Node.js Buffer. */
  async toBuffer(): Promise<Buffer> {
    const buf = await this.workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  /** Write the workbook to a file on disk. */
  async toFile(path: string): Promise<void> {
    await this.workbook.xlsx.writeFile(path);
  }

  /** Obtain a readable stream of the workbook content. */
  toStream(): PassThrough {
    const stream = new PassThrough();
    void (async () => {
      const buf = await this.workbook.xlsx.writeBuffer();
      stream.end(Buffer.from(buf));
    })();
    return stream;
  }

  /** Encode the workbook as a base64 string. */
  async toBase64(): Promise<string> {
    const buf = await this.toBuffer();
    return buf.toString('base64');
  }
}

// ──────── Builder ────────

/**
 * Fluent builder for multi-sheet workbooks.
 *
 * @example
 * ```typescript
 * const wb = await createBuilder({ author: 'MyApp' })
 *   .addSheet('Users', users)
 *   .addSheet('Orders', orders, orderColumns)
 *   .build();
 *
 * const buffer = await wb.toBuffer();
 * ```
 */
export class ExcelBuilder {
  private sheets: SheetEntry[] = [];
  private options: ExcelExportOptions;

  constructor(options?: ExcelExportOptions) {
    this.options = options ?? {};
  }

  /** Add a worksheet with data and optional column definitions. */
  addSheet(
    name: string,
    data: Record<string, unknown>[],
    columns?: string[] | Partial<Column>[],
  ): this {
    this.sheets.push({ name, data, columns });
    return this;
  }

  /** Build the workbook and return an `ExcelWorkbook`. */
  async build(): Promise<ExcelWorkbook> {
    const mod = await loadExcel();
    const wb = new mod.Workbook();
    wb.creator = this.options.author ?? this.options.createdBy ?? 'NestKit';
    wb.created = new Date();

    if (this.sheets.length === 0) {
      wb.addWorksheet(this.options.sheetName ?? 'Sheet1').addRow([]);
    } else {
      const globalFormatters = this.options.formatters;

      for (const entry of this.sheets) {
        let resolved = resolveColumns(entry.columns, entry.data);
        const excluded = this.options.excludeColumns;
        if (excluded?.length) {
          const excludeSet = new Set(excluded);
          resolved = resolved.filter((c) => c.key && !excludeSet.has(c.key));
        }
        const ws = wb.addWorksheet(entry.name);
        ws.columns = resolved;

        const mergedHeader = mergeStyle(DEFAULT_HEADER, this.options.headerStyle);
        const headerRow = ws.getRow(1);
        applyRowStyle(headerRow, mergedHeader);

        for (const item of entry.data) {
          const rowValues = resolved.map((c) => {
            const key = c.key!;
            const raw = item[key] ?? null;
            if (raw !== null && globalFormatters?.[key]) {
              return globalFormatters[key](raw, item);
            }
            return raw;
          });
          const row = ws.addRow(rowValues);
          applyCellStyles(row, resolved);
        }

        if (this.options.useAutoFilter !== false && entry.data.length > 0) {
          ws.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: entry.data.length + 1, column: resolved.length },
          };
        }

        if (this.options.freezePane) {
          const fp = parseFreezePane(this.options.freezePane);
          if (fp) {
            ws.views = [{ state: 'frozen', ...fp }];
          }
        }
      }
    }

    return new ExcelWorkbook(wb);
  }
}

// ──────── Public convenience functions ────────

/**
 * Build a single-sheet workbook from an array of objects.
 *
 * @returns An `ExcelWorkbook` — call `.toBuffer()`, `.toFile(path)`, etc.
 */
export function buildWorkbook<T extends Record<string, unknown>>(
  data: T[],
  options?: ExcelExportOptions,
): Promise<ExcelWorkbook> {
  return createBuilder(options)
    .addSheet(options?.sheetName ?? 'Sheet1', data, options?.columns)
    .build();
}

/**
 * Create a multi-sheet workbook builder.
 *
 * @example
 * ```typescript
 * const wb = await createBuilder({ author: 'Admin' })
 *   .addSheet('Users', users)
 *   .addSheet('Orders', orders)
 *   .build();
 * ```
 */
export function createBuilder(options?: ExcelExportOptions): ExcelBuilder {
  return new ExcelBuilder(options);
}

/**
 * Export data directly to a Node.js Buffer.
 *
 * Use for S3 upload, MinIO, or returning inline in API responses.
 */
export async function exportToBuffer<T extends Record<string, unknown>>(
  data: T[],
  options?: ExcelExportOptions,
): Promise<Buffer> {
  const wb = await buildWorkbook(data, options);
  return wb.toBuffer();
}

/**
 * Export data directly to an .xlsx file on disk.
 */
export async function exportToFile<T extends Record<string, unknown>>(
  data: T[],
  path: string,
  options?: ExcelExportOptions,
): Promise<void> {
  const wb = await buildWorkbook(data, options);
  return wb.toFile(path);
}

/**
 * Export data as a readable PassThrough stream.
 *
 * Useful for piping to an HTTP response.
 *
 * @example
 * ```typescript
 * import { Response } from 'express';
 *
 * @Get('export')
 * async export(@Res() res: Response) {
 *   const stream = exportToStream(data);
 *   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 *   res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
 *   stream.pipe(res);
 * }
 * ```
 */
export function exportToStream<T extends Record<string, unknown>>(
  data: T[],
  options?: ExcelExportOptions,
): PassThrough {
  // Start building in background; return stream immediately
  const stream = new PassThrough();
  void buildWorkbook(data, options)
    .then((wb) => wb.toStream())
    .then((s) => s.pipe(stream));
  return stream;
}

/**
 * Export data as a base64-encoded string.
 *
 * Useful for embedding in JSON responses or email attachments.
 */
export async function exportToBase64<T extends Record<string, unknown>>(
  data: T[],
  options?: ExcelExportOptions,
): Promise<string> {
  const wb = await buildWorkbook(data, options);
  return wb.toBase64();
}

/**
 * Export data directly to an HTTP response (Express / NestJS).
 *
 * @example
 * ```typescript
 * import { Response } from 'express';
 *
 * @Get('download')
 * async download(@Res() res: Response) {
 *   await exportToResponse(data, res, 'report.xlsx');
 * }
 * ```
 */
export async function exportToResponse(
  data: Record<string, unknown>[],
  res: ExportResponse,
  filename?: string,
  options?: ExcelExportOptions,
): Promise<void> {
  const buf = await exportToBuffer(data, options);
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename || 'export.xlsx'}"`);
  res.end(buf);
}

// ──────── Internal helpers ────────

function resolveColumns(
  columns: string[] | Partial<Column>[] | undefined,
  data: Record<string, unknown>[],
): Partial<Column>[] {
  if (!columns) return autoColumns(data);
  if (columns.length > 0 && typeof columns[0] === 'string') {
    return (columns as string[]).map((k) => ({
      header:
        k.charAt(0).toUpperCase() +
        k
          .slice(1)
          .replace(/([A-Z])/g, ' $1')
          .trim(),
      key: k,
      width: Math.min(Math.max(k.length + 5, 12), 50),
    }));
  }
  return columns;
}

function autoColumns(data: Record<string, unknown>[]): Partial<Column>[] {
  if (data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map((k) => ({
    header:
      k.charAt(0).toUpperCase() +
      k
        .slice(1)
        .replace(/([A-Z])/g, ' $1')
        .trim(),
    key: k,
    width: Math.min(Math.max(k.length + 5, 12), 50),
  }));
}

function parseFreezePane(
  ref: string,
): { xSplit: number; ySplit: number; topLeftCell: string } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const colLetters = match[1];
  const rowNum = parseInt(match[2], 10);
  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64);
  }
  return { xSplit: col, ySplit: rowNum - 1, topLeftCell: ref };
}

function mergeStyle(base: Partial<Style>, override?: Partial<Style>): Partial<Style> {
  if (!override) return base;
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const val = (override as Record<string, unknown>)[key];
    if (val !== null && val !== undefined) {
      if (typeof val === 'object' && !Array.isArray(val)) {
        result[key] = {
          ...(result[key] as Record<string, unknown>),
          ...(val as Record<string, unknown>),
        };
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

function applyRowStyle(row: Row, style: Partial<Style>): void {
  row.eachCell((cell: Cell) => {
    if (style.font) cell.font = style.font;
    if (style.fill) cell.fill = style.fill;
    if (style.alignment) cell.alignment = style.alignment;
    if (style.border) cell.border = style.border;
  });
}

function applyCellStyles(row: Row, columns: Partial<Column>[]): void {
  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cell = row.getCell(ci + 1);
    if (col.style) {
      const s = col.style;
      if (s.font) cell.font = { ...cell.font, ...(s.font as object) };
      if (s.fill) Object.assign(cell.fill, s.fill);
      if (s.alignment) cell.alignment = { ...cell.alignment, ...(s.alignment as object) };
      if (s.border) Object.assign(cell.border, s.border);
      if (s.numFmt) cell.numFmt = s.numFmt;
    }
  }
}
