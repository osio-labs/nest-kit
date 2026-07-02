# @os.io/nest-kit/infra/excel

> Export and import Excel (.xlsx) files with the full `exceljs` type system.

```typescript
import { exportToBuffer, importFromFile } from '@os.io/nest-kit/infra/excel';

// Export
const buffer = await exportToBuffer(users);

// Import
const rows = await importFromFile('./data.xlsx');
```

## Installation

```bash
npm install @os.io/nest-kit exceljs
```

`exceljs` is an **optional peer dependency** — the module is safe to import without it; errors are thrown only on use.

---

## Export

### Buffer — upload to S3 / MinIO / API response

```typescript
import { exportToBuffer } from '@os.io/nest-kit/infra/excel';

const buffer = await exportToBuffer(data);
```

### File — save to disk

```typescript
import { exportToFile } from '@os.io/nest-kit/infra/excel';

await exportToFile(data, './reports/report.xlsx');
```

### Stream — download response

```typescript
import { Response } from 'express';
import { exportToStream } from '@os.io/nest-kit/infra/excel';

@Get('export')
async export(@Res() res: Response) {
  const stream = exportToStream(data);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
  stream.pipe(res);
}
```

### Base64 — embed in JSON / email

```typescript
import { exportToBase64 } from '@os.io/nest-kit/infra/excel';

const b64 = await exportToBase64(data);
```

### Express / NestJS Response — single call

```typescript
import { Response } from 'express';
import { exportToResponse } from '@os.io/nest-kit/infra/excel';

@Get('export')
async export(@Res() res: Response) {
  const data = await this.service.findAll();
  await exportToResponse(data, res, 'report.xlsx');
}
```

---

## Import

### From Buffer

```typescript
import { importFromBuffer } from '@os.io/nest-kit/infra/excel';

const rows = await importFromBuffer(uploadedFile.buffer);
```

### From File

```typescript
import { importFromFile } from '@os.io/nest-kit/infra/excel';

const rows = await importFromFile('./data.xlsx');
```

### From URL

```typescript
import { importFromUrl } from '@os.io/nest-kit/infra/excel';

const rows = await importFromUrl('https://example.com/data.xlsx');
```

### From Stream

```typescript
import { importFromStream } from '@os.io/nest-kit/infra/excel';

const rows = await importFromStream(readableStream);
```

### Import Options

```typescript
const rows = await importFromFile('./data.xlsx', {
  sheet: 'Sheet1', // or 0 (0-based index)
  headerRow: 1, // 0 = no header (returns indexed keys)
  skipEmpty: true, // skip rows where all cells are empty
  trim: true, // trim string values
});
```

---

## Column definitions

### Full exceljs `Column` objects

```typescript
import type { Column } from 'exceljs';

const columns: Partial<Column>[] = [
  { header: 'Full Name', key: 'name', width: 30 },
  { header: 'Email', key: 'email', width: 35 },
  { header: 'Score', key: 'score', width: 12, style: { numFmt: '#,##0.00' } },
];

const buffer = await exportToBuffer(data, { sheetName: 'Users', columns });
```

### String shorthand (keys only)

```typescript
const buffer = await exportToBuffer(data, { columns: ['name', 'email'] });
```

Columns are **auto-detected** from the first object's keys when omitted.

---

## Styling

### Header style

Override with the full `Style` type:

```typescript
import type { Style } from 'exceljs';

await exportToBuffer(data, {
  headerStyle: {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
});
```

### Per-column cell style

```typescript
const columns: Partial<Column>[] = [
  {
    header: 'Score',
    key: 'score',
    width: 12,
    style: {
      numFmt: '#,##0.00',
      font: { bold: true, color: { argb: 'FF006100' } },
      alignment: { horizontal: 'right' },
    },
  },
];
```

---

## Formatters

Transform cell values for display without mutating the original data.

```typescript
const buffer = await exportToBuffer(data, {
  columns: ['name', 'active', 'salary'],
  formatters: {
    active: (v) => (v ? 'Active' : 'Inactive'),
    salary: (v) => `$${(v as number).toLocaleString()}`,
  },
});
```

---

## Exclude Columns

```typescript
const buffer = await exportToBuffer(data, { excludeColumns: ['internalId'] });
```

---

## Auto-filter

Enabled by default. Set `useAutoFilter: false` to disable.

```typescript
await exportToBuffer(data, { useAutoFilter: false });
```

---

## Freeze panes

```typescript
// Freeze first row
await exportToBuffer(data, { freezePane: 'A2' });

// Freeze first column
await exportToBuffer(data, { freezePane: 'B1' });

// Freeze first row + first column
await exportToBuffer(data, { freezePane: 'B2' });
```

---

## Multi-sheet workbooks

```typescript
import { createBuilder } from '@os.io/nest-kit/infra/excel';

const wb = await createBuilder({ author: 'MyApp' })
  .addSheet('Users', users)
  .addSheet('Orders', orders, orderColumns)
  .build();

const buffer = await wb.toBuffer();
```

---

## API

### Export Functions

| Function                             | Returns                  | Description                   |
| ------------------------------------ | ------------------------ | ----------------------------- |
| `exportToBuffer(data, options?)`     | `Promise<Buffer>`        | Export to Node.js Buffer      |
| `exportToFile(data, path, options?)` | `Promise<void>`          | Write to disk                 |
| `exportToStream(data, options?)`     | `PassThrough`            | Export as readable stream     |
| `exportToBase64(data, options?)`     | `Promise<string>`        | Export as base64 string       |
| `exportToResponse(data, res, fn?)`   | `Promise<void>`          | Send as HTTP download         |
| `buildWorkbook(data, options?)`      | `Promise<ExcelWorkbook>` | Build a single-sheet workbook |
| `createBuilder(options?)`            | `ExcelBuilder`           | Create multi-sheet builder    |

### Import Functions

| Function                             | Returns                              | Description             |
| ------------------------------------ | ------------------------------------ | ----------------------- |
| `importFromBuffer(buf, options?)`    | `Promise<Record<string, unknown>[]>` | Parse a Buffer          |
| `importFromFile(path, options?)`     | `Promise<Record<string, unknown>[]>` | Parse a file from disk  |
| `importFromUrl(url, options?)`       | `Promise<Record<string, unknown>[]>` | Fetch and parse a URL   |
| `importFromStream(stream, options?)` | `Promise<Record<string, unknown>[]>` | Parse a readable stream |

### `ExcelBuilder`

| Method                           | Returns                  | Description               |
| -------------------------------- | ------------------------ | ------------------------- |
| `addSheet(name, data, columns?)` | `ExcelBuilder`           | Add a worksheet           |
| `build()`                        | `Promise<ExcelWorkbook>` | Build and return workbook |

### `ExcelWorkbook`

| Method         | Returns           | Description           |
| -------------- | ----------------- | --------------------- |
| `toBuffer()`   | `Promise<Buffer>` | Node.js Buffer        |
| `toFile(path)` | `Promise<void>`   | Write to disk         |
| `toStream()`   | `PassThrough`     | Readable stream       |
| `toBase64()`   | `Promise<string>` | Base64-encoded string |

### `ExcelExportOptions`

| Param            | Type                            | Default                 | Description                 |
| ---------------- | ------------------------------- | ----------------------- | --------------------------- |
| `sheetName`      | `string`                        | `'Sheet1'`              | Worksheet name              |
| `columns`        | `string[] \| Partial<Column>[]` | Auto-detected           | Column defs or key names    |
| `headerStyle`    | `Partial<Style>`                | Bold white on `#1F4E79` | Header row style            |
| `useAutoFilter`  | `boolean`                       | `true`                  | Enable auto-filter          |
| `freezePane`     | `string`                        | —                       | Freeze panes (e.g. `'A2'`)  |
| `formatters`     | `Record<string, FormatterFn>`   | —                       | Global value formatters     |
| `excludeColumns` | `string[]`                      | —                       | Keys to exclude from output |
| `author`         | `string`                        | —                       | Document author             |
| `createdBy`      | `string`                        | —                       | Document creator            |

### `ExcelImportOptions`

| Param       | Type               | Default | Description                            |
| ----------- | ------------------ | ------- | -------------------------------------- |
| `sheet`     | `number \| string` | `0`     | Sheet index (0-based) or name          |
| `headerRow` | `number`           | `1`     | Row number of header (`0` = no header) |
| `skipEmpty` | `boolean`          | `true`  | Skip rows where all cells are empty    |
| `trim`      | `boolean`          | `true`  | Trim string cell values                |

### Types

| Type                 | Description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `FormatterFn`        | `(value: unknown, row: Record<string, unknown>) => unknown`               |
| `ExportResponse`     | `Writable & { setHeader(name, value): void }` — Express/NestJS compatible |
| `ExcelExportOptions` | All export options                                                        |
| `ExcelImportOptions` | All import options                                                        |
| `ExcelWorkbook`      | Output workbook                                                           |
| `ExcelBuilder`       | Multi-sheet builder                                                       |

---

## Comparison with nesthub/excel

| Feature               | nesthub/excel                                                 | nest-kit/excel                                                    |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Style model**       | Simplified wrappers (`headerFont`, `headerBg`, `borderColor`) | Full exceljs `Style` type (font, fill, alignment, border, numFmt) |
| **Column types**      | Proprietary `ExcelColumn`                                     | `string[]` shorthand **or** native `Partial<Column>`              |
| **Formatters**        | Per-column + global `formatters` callback                     | Global `formatters` callback                                      |
| **Import support**    | —                                                             | Buffer, File, URL, Stream — with header/trim/skip options         |
| **Multi-sheet**       | —                                                             | Fluent `ExcelBuilder.addSheet().addSheet().build()`               |
| **Outputs**           | Buffer, File, Express Response                                | Buffer, File, Stream, Base64, Response                            |
| **Dynamic import**    | Hard dependency                                               | Optional peer dep — throws only on use                            |
| **Auto-filter**       | Configurable `useAutoFilter: boolean`                         | Configurable `useAutoFilter: boolean` (default true)              |
| **Freeze panes**      | —                                                             | `freezePane` option (`'A2'`, `'B1'`, `'B2'`, …)                   |
| **Response helper**   | `exportToResponse(data, res, filename?, options?)`            | `exportToResponse(data, res, filename?, options?)`                |
| **Column shorthand**  | `string[]` (`['name']`)                                       | `string[]` (`['name']`)                                           |
| **Auto columns**      | All object keys                                               | All object keys                                                   |
| **Exclude columns**   | —                                                             | `excludeColumns` option                                           |
| **Header defaults**   | Calibri 11 bold, bg `4472C4`                                  | Calibri 11 bold white, bg `1F4E79`, centered + borders            |
| **Optional peer dep** | —                                                             | ✓ (exceljs not required at import time)                           |
| **Document metadata** | —                                                             | author, creator                                                   |

### Feature parity (nest-kit covers all nesthub features + more)

| nesthub feature                                    | nest-kit status                                      |
| -------------------------------------------------- | ---------------------------------------------------- |
| `exportToBuffer(data, options?)`                   | ✓ `exportToBuffer(data, options)`                    |
| `exportToFile(data, path, options?)`               | ✓ `exportToFile(data, path, options)`                |
| `exportToResponse(data, res, filename?, options?)` | ✓ `exportToResponse(data, res, filename?, options?)` |
| String column shorthand                            | ✓                                                    |
| Global formatters                                  | ✓                                                    |
| Configurable auto-filter                           | ✓                                                    |
| ExcelColumn.header                                 | ✓ `Column.header`                                    |
| ExcelColumn.width                                  | ✓ `Column.width`                                     |
| Per-column formatter                               | ✓ Via global `formatters` or `Column.style.numFmt`   |
| Simplified header style                            | ✓ Via full `Style` type (strict superset)            |
| Import .xlsx → JSON                                | ✓ `importFromBuffer`, `importFromFile`, …            |
| Minimal API surface                                | ✓                                                    |
