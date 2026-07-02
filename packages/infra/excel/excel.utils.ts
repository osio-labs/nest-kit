import type { Workbook } from 'exceljs';

/** Internal type for the dynamically loaded exceljs module. */
export interface ExcelJSModule {
  Workbook: new () => Workbook;
}

/** Load exceljs on demand (optional peer dependency). */
export async function loadExcel(): Promise<ExcelJSModule> {
  try {
    return await import('exceljs');
  } catch {
    throw new Error(
      'Cannot find module "exceljs". Install the optional peer dependency:\n\n  npm install exceljs\n',
    );
  }
}
