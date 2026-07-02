# Infra / Excel Export

> Export arrays of objects to Excel (.xlsx) using the full `exceljs` type system.

```
@os.io/nest-kit/infra/excel
```

---

## Installation

The `exceljs` package is an optional peer dependency:

```bash
npm install exceljs
```

---

## Quick Start

```typescript
import { ExcelService } from '@os.io/nest-kit/infra/excel';

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', score: 95.5 },
  { id: 2, name: 'Bob', email: 'bob@example.com', score: 87.0 },
];

const buffer = await ExcelService.fromData(users).then((wb) => wb.toBuffer());
```

---

## Output Formats

### Buffer — upload to S3, MinIO, API response

```typescript
const buffer = await ExcelService.fromData(data).then((wb) => wb.toBuffer());
```

### File — save to disk

```typescript
await ExcelService.fromData(data).then((wb) => wb.toFile('./report.xlsx'));
```

### Stream — API download

```typescript
import { Response } from 'express';

@Get('export')
async export(@Res() res: Response) {
  const stream = await ExcelService.fromData(data).then((wb) => wb.toStream());
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
  stream.pipe(res);
}
```

### Express / NestJS Response — single call

```typescript
import { Response } from 'express';

@Get('export')
async export(@Res() res: Response) {
  const data = await this.service.findAll();
  await ExcelService.exportToResponse(data, res, 'users.xlsx');
}
```

### Base64 — embed or inline

```typescript
const b64 = await ExcelService.fromData(data).then((wb) => wb.toBase64());
```

---

## Column Definitions

### Full exceljs `Column` objects

```typescript
import type { Column } from 'exceljs';

const columns: Partial<Column>[] = [
  { header: 'Full Name', key: 'name', width: 30 },
  { header: 'Email', key: 'email', width: 35 },
  { header: 'Score', key: 'score', width: 12, style: { numFmt: '#,##0.00' } },
];

const buffer = await ExcelService.fromData(users, { sheetName: 'Users', columns }).then((wb) =>
  wb.toBuffer(),
);
```

### String shorthand (keys only)

```typescript
const buffer = await ExcelService.fromData(data, { columns: ['name', 'email', 'score'] }).then(
  (wb) => wb.toBuffer(),
);
```

Auto-detected from object keys when omitted.

---

## Custom Styling

Uses `exceljs` `Style` type directly for header and cell styles.

```typescript
import type { Column, Style } from 'exceljs';

const buffer = await ExcelService.fromData(users, {
  sheetName: 'Users',
  headerStyle: {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  },
}).then((wb) => wb.toBuffer());
```

Per-column cell styles via `Column.style`:

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

Transform cell values for display without mutating source data.

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

## Freeze Panes

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

## Multi-Sheet Workbooks

```typescript
const wb = await ExcelService.create({ author: 'MyApp' })
  .addSheet('Users', users, userColumns)
  .addSheet('Orders', orders, orderColumns)
  .build();

const buffer = await wb.toBuffer();
```

---

## API

### ExcelService

| Method                                          | Returns         | Description                       |
| ----------------------------------------------- | --------------- | --------------------------------- |
| `fromData(data, opts?)`                         | `ExcelWorkbook` | Create workbook from object array |
| `exportToResponse(data, res, filename?, opts?)` | `Promise<void>` | Send as HTTP download             |
| `create(opts?)`                                 | `ExcelBuilder`  | Start multi-sheet builder         |

### ExcelBuilder

| Method                           | Returns         | Description        |
| -------------------------------- | --------------- | ------------------ |
| `addSheet(name, data, columns?)` | `ExcelBuilder`  | Add a worksheet    |
| `build()`                        | `ExcelWorkbook` | Build the workbook |

### ExcelWorkbook

| Method         | Returns           | Description           |
| -------------- | ----------------- | --------------------- |
| `toBuffer()`   | `Promise<Buffer>` | Node.js Buffer        |
| `toFile(path)` | `Promise<void>`   | Write to disk         |
| `toStream()`   | `PassThrough`     | Readable stream       |
| `toBase64()`   | `Promise<string>` | Base64-encoded string |

### Options

| Param           | Type                            | Default                 | Description                |
| --------------- | ------------------------------- | ----------------------- | -------------------------- |
| `sheetName`     | `string`                        | `'Sheet1'`              | Worksheet name             |
| `columns`       | `string[] \| Partial<Column>[]` | Auto-detected           | Column defs or key names   |
| `headerStyle`   | `Partial<Style>`                | Bold white on `#1F4E79` | Header row style           |
| `useAutoFilter` | `boolean`                       | `true`                  | Enable auto-filter         |
| `freezePane`    | `string`                        | —                       | Freeze panes (e.g. `'A2'`) |
| `formatters`    | `Record<string, FormatterFn>`   | —                       | Global value formatters    |
| `author`        | `string`                        | —                       | Document author            |

### Types

All column and style types come directly from `exceljs` — no wrappers:

| Type                 | Source    | Description                                        |
| -------------------- | --------- | -------------------------------------------------- |
| `Column`             | `exceljs` | Column definition                                  |
| `Style`              | `exceljs` | Cell style (font, fill, alignment, border, numFmt) |
| `Font`               | `exceljs` | Font properties                                    |
| `Fill`               | `exceljs` | Fill / background                                  |
| `Alignment`          | `exceljs` | Text alignment                                     |
| `Borders` / `Border` | `exceljs` | Cell borders                                       |
| `FormatterFn`        | nest-kit  | `(value, row) => unknown`                          |
| `ExportResponse`     | nest-kit  | `Writable & { setHeader }`                         |
| `ExcelOptions`       | nest-kit  | All export options                                 |
