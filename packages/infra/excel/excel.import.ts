import { Readable } from 'node:stream';
import type { Cell, Workbook } from 'exceljs';
import { loadExcel } from './excel.utils.js';
import type { ExcelImportOptions } from './excel.types.js';

/**
 * Parse an .xlsx Buffer into an array of objects.
 *
 * @example
 * ```typescript
 * const rows = await importFromBuffer(buf);
 * ```
 */
export async function importFromBuffer(
  buf: Buffer,
  options?: ExcelImportOptions,
): Promise<Record<string, unknown>[]> {
  const stream = new Readable();
  stream.push(buf);
  stream.push(null);
  return importFromStream(stream, options);
}

/**
 * Parse an .xlsx file from disk into an array of objects.
 */
export async function importFromFile(
  path: string,
  options?: ExcelImportOptions,
): Promise<Record<string, unknown>[]> {
  const mod = await loadExcel();
  const wb = new mod.Workbook();
  await wb.xlsx.readFile(path);
  return readSheet(wb, options);
}

/**
 * Parse an .xlsx file from a URL into an array of objects.
 */
export async function importFromUrl(
  url: string,
  options?: ExcelImportOptions,
): Promise<Record<string, unknown>[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
  }
  return importFromBuffer(Buffer.from(await response.arrayBuffer()), options);
}

/**
 * Parse an .xlsx from a readable stream into an array of objects.
 */
export async function importFromStream(
  stream: Readable,
  options?: ExcelImportOptions,
): Promise<Record<string, unknown>[]> {
  const mod = await loadExcel();
  const wb = new mod.Workbook();
  await wb.xlsx.read(stream);
  return readSheet(wb, options);
}

// ──────── Internal ────────

function readSheet(workbook: Workbook, options?: ExcelImportOptions): Record<string, unknown>[] {
  const sheetIndex = options?.sheet ?? 0;
  const sheet =
    typeof sheetIndex === 'number'
      ? workbook.worksheets[sheetIndex]
      : (workbook.getWorksheet(sheetIndex) ?? undefined);

  if (!sheet) return [];

  const headerRowNum = options?.headerRow ?? 1;
  const skipEmpty = options?.skipEmpty !== false;
  const trim = options?.trim !== false;

  // Collect all non-empty rows with their 1-based row numbers
  const rowEntries: { num: number; values: unknown[] }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row: import('exceljs').Row, rowNumber: number) => {
    const values = readRowValues(row, trim);
    if (skipEmpty && values.every((v) => v === null || v === '')) return;
    rowEntries.push({ num: rowNumber, values });
  });

  if (rowEntries.length === 0) return [];

  // Extract header by row number
  let headers: string[] = [];
  if (headerRowNum > 0) {
    const headerIdx = rowEntries.findIndex((e) => e.num === headerRowNum);
    if (headerIdx < 0) return [];
    headers = rowEntries[headerIdx].values as string[];
    rowEntries.splice(headerIdx, 1);
  }

  const results: Record<string, unknown>[] = [];

  for (const entry of rowEntries) {
    if (headerRowNum === 0) {
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < entry.values.length; j++) {
        obj[String(j)] = entry.values[j];
      }
      results.push(obj);
    } else {
      const obj: Record<string, unknown> = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = j < entry.values.length ? entry.values[j] : null;
      }
      results.push(obj);
    }
  }

  return results;
}

function readRowValues(row: import('exceljs').Row, trim: boolean): unknown[] {
  const values: unknown[] = [];
  row.eachCell((cell: Cell, colIndex: number) => {
    while (values.length < colIndex - 1) {
      values.push(null);
    }
    let val = cell.value;
    if (trim && typeof val === 'string') {
      val = val.trim();
    }
    values.push(val ?? null);
  });
  return values;
}
