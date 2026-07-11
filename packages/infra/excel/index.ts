/**
 * @os.io/nest-kit/infra/excel
 *
 * Export and import Excel (.xlsx) files with the full `exceljs` type system.
 *
 * ## Export
 *
 * ```typescript
 * import { exportToBuffer, exportToFile } from '@os.io/nest-kit/infra/excel';
 *
 * const buffer = await exportToBuffer(users);
 * await exportToFile(orders, './report.xlsx');
 * ```
 *
 * ## Import
 *
 * ```typescript
 * import { importFromBuffer, importFromFile } from '@os.io/nest-kit/infra/excel';
 *
 * const rows = await importFromFile('./data.xlsx');
 * const rows = await importFromBuffer(uploadedFile.buffer);
 * ```
 *
 * @module
 * @packageDocumentation
 */

// export
export {
  exportToBuffer,
  exportToFile,
  exportToStream,
  exportToBase64,
  exportToResponse,
  buildWorkbook,
  createBuilder,
  ExcelBuilder,
  ExcelWorkbook,
} from './excel.export.js';

// import
export {
  importFromBuffer,
  importFromFile,
  importFromUrl,
  importFromStream,
} from './excel.import.js';

// types
export type {
  ExcelExportOptions,
  ExcelImportOptions,
  FormatterFn,
  ExportResponse,
} from './excel.types.js';
