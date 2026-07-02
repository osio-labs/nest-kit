# @os.io/nest-kit/infra/excel

> Export JSON data to Excel (.xlsx) — the most comprehensive exceljs wrapper for NestJS.

```typescript
import { ExcelService } from '@os.io/nest-kit/infra/excel';

const users = [
  { name: 'Alice', email: 'alice@example.com', score: 95.5 },
  { name: 'Bob', email: 'bob@example.com', score: 87.0 },
];

const buffer = await ExcelService.fromData(users).then((wb) => wb.toBuffer());
```

## Installation

```bash
npm install @os.io/nest-kit exceljs
```

`exceljs` is an **optional peer dependency** — the module is safe to import
even when exceljs is not installed; you only get an error when you call an
export method.

---

## Usage

### Buffer — upload to S3 / MinIO / API response

```typescript
const buffer = await ExcelService.fromData(data).then((wb) => wb.toBuffer());
```

### File — save to disk

```typescript
await ExcelService.fromData(data).then((wb) => wb.toFile('./reports/report.xlsx'));
```

### Stream — download response

```typescript
import { Response } from 'express';

@Get('export')
async export(@Res() res: Response) {
  const stream = await ExcelService
    .fromData(data)
    .then((wb) => wb.toStream());

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
  stream.pipe(res);
}
```

### Base64 — embed in JSON / email

```typescript
const b64 = await ExcelService.fromData(data).then((wb) => wb.toBase64());
```

### Express / NestJS Response — single call

```typescript
import { Response } from 'express';

@Get('export')
async export(@Res() res: Response) {
  const data = await this.service.findAll();
  await ExcelService.exportToResponse(data, res, 'report.xlsx');
}
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

const buffer = await ExcelService.fromData(data, { sheetName: 'Users', columns }).then((wb) =>
  wb.toBuffer(),
);
```

### String shorthand (keys only)

```typescript
const buffer = await ExcelService.fromData(data, { columns: ['name', 'email'] }).then((wb) =>
  wb.toBuffer(),
);
```

Columns are **auto-detected** from the first object's keys when omitted.

---

## Styling

### Header style

Override with the full `Style` type:

```typescript
import type { Style } from 'exceljs';

await ExcelService.fromData(data, {
  headerStyle: {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
}).then((wb) => wb.toBuffer());
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

### Global formatters

```typescript
const buffer = await ExcelService.fromData(data, {
  columns: ['name', 'active', 'salary'],
  formatters: {
    active: (v) => (v ? 'Active' : 'Inactive'),
    salary: (v) => `$${(v as number).toLocaleString()}`,
  },
}).then((wb) => wb.toBuffer());
```

---

## Auto-filter

Enabled by default. Set `useAutoFilter: false` to disable.

```typescript
await ExcelService.fromData(data, { useAutoFilter: false });
```

---

## Freeze panes

Freeze rows, columns, or both by specifying the top-left visible cell.

```typescript
// Freeze first row
await ExcelService.fromData(data, { freezePane: 'A2' });

// Freeze first column
await ExcelService.fromData(data, { freezePane: 'B1' });

// Freeze first row + first column
await ExcelService.fromData(data, { freezePane: 'B2' });
```

---

## Multi-sheet workbooks

```typescript
const wb = await ExcelService.create({ author: 'MyApp' })
  .addSheet('Users', users)
  .addSheet('Orders', orders, orderColumns)
  .build();

const buffer = await wb.toBuffer();
```

---

## API

### `ExcelService.fromData(data, options?)`

| Param                   | Type                            | Default                 | Description                |
| ----------------------- | ------------------------------- | ----------------------- | -------------------------- |
| `data`                  | `Record<string, unknown>[]`     | —                       | Array of flat objects      |
| `options.sheetName`     | `string`                        | `'Sheet1'`              | Worksheet name             |
| `options.columns`       | `string[] \| Partial<Column>[]` | Auto-detected           | Column defs or key names   |
| `options.headerStyle`   | `Partial<Style>`                | Bold white on `#1F4E79` | Header row style           |
| `options.useAutoFilter` | `boolean`                       | `true`                  | Enable auto-filter         |
| `options.freezePane`    | `string`                        | —                       | Freeze panes (e.g. `'A2'`) |
| `options.formatters`    | `Record<string, FormatterFn>`   | —                       | Global value formatters    |
| `options.author`        | `string`                        | —                       | Document author            |

Returns `Promise<ExcelWorkbook>`.

### `ExcelService.exportToResponse(data, res, filename?, options?)`

| Param      | Type                        | Default         | Description                      |
| ---------- | --------------------------- | --------------- | -------------------------------- |
| `data`     | `Record<string, unknown>[]` | —               | Array of flat objects            |
| `res`      | `ExportResponse`            | —               | Express / NestJS response object |
| `filename` | `string`                    | `'export.xlsx'` | Download filename                |
| `options`  | `ExcelOptions`              | —               | Same as `fromData`               |

Returns `Promise<void>`.

### `ExcelService.create(options?)`

Returns an `ExcelBuilder` for multi-sheet workbooks.

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

### Types

| Type             | Description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `FormatterFn`    | `(value: unknown, row: Record<string, unknown>) => unknown`               |
| `ExportResponse` | `Writable & { setHeader(name, value): void }` — Express/NestJS compatible |
| `ExcelOptions`   | All export options                                                        |
| `ExcelWorkbook`  | Output workbook                                                           |
| `ExcelBuilder`   | Multi-sheet builder                                                       |

---

## Comparison with nesthub/excel

| Feature               | nesthub/excel                                                 | nest-kit/excel                                                    |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Style model**       | Simplified wrappers (`headerFont`, `headerBg`, `borderColor`) | Full exceljs `Style` type (font, fill, alignment, border, numFmt) |
| **Column types**      | Proprietary `ExcelColumn`                                     | `string[]` shorthand **or** native `Partial<Column>`              |
| **Formatters**        | Per-column + global `formatters` callback                     | Global `formatters` callback                                      |
| **Multi-sheet**       | —                                                             | Fluent `ExcelBuilder.addSheet().addSheet().build()`               |
| **Outputs**           | Buffer, File, Express Response                                | Buffer, File, Stream, Base64, Response                            |
| **Dynamic import**    | Hard dependency                                               | Optional peer dep — throws only on use                            |
| **Auto-filter**       | Configurable `useAutoFilter: boolean`                         | Configurable `useAutoFilter: boolean` (default true)              |
| **Freeze panes**      | —                                                             | `freezePane` option (`'A2'`, `'B1'`, `'B2'`, …)                   |
| **Response helper**   | `exportToResponse(data, res, filename?, options?)`            | `exportToResponse(data, res, filename?, options?)`                |
| **Column shorthand**  | `string[]` (`['name']`)                                       | `string[]` (`['name']`)                                           |
| **Auto columns**      | All object keys                                               | All object keys                                                   |
| **Header defaults**   | Calibri 11 bold, bg `4472C4`                                  | Calibri 11 bold white, bg `1F4E79`, centered + borders            |
| **Optional peer dep** | —                                                             | ✓ (exceljs not required at import time)                           |
| **Document metadata** | —                                                             | author, creator                                                   |

### Feature parity (nest-kit covers all nesthub features + more)

| nesthub feature                                    | nest-kit status                                      |
| -------------------------------------------------- | ---------------------------------------------------- |
| `exportToBuffer(data, options?)`                   | ✓ `fromData(data, options) → toBuffer()`             |
| `exportToFile(data, path, options?)`               | ✓ `fromData(data) → toFile(path)`                    |
| `exportToResponse(data, res, filename?, options?)` | ✓ `exportToResponse(data, res, filename?, options?)` |
| String column shorthand                            | ✓                                                    |
| Global formatters                                  | ✓                                                    |
| Configurable auto-filter                           | ✓                                                    |
| ExcelColumn.header                                 | ✓ `Column.header`                                    |
| ExcelColumn.width                                  | ✓ `Column.width`                                     |
| Per-column formatter                               | ✓ Via global `formatters` or `Column.style.numFmt`   |
| Simplified header style                            | ✓ Via full `Style` type (strict superset)            |
| Minimal API surface                                | ✓                                                    |
