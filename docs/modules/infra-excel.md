# Infra / Excel

> Export and import Excel (.xlsx) files with the full `exceljs` type system.

```
@os.io/nest-kit/infra/excel
```

---

## Installation

```bash
npm install @os.io/nest-kit exceljs
```

`exceljs` is an **optional peer dependency** — safe to import without it; errors are thrown only on use.

---

## Quick Start

### Export

```typescript
import { exportToBuffer, exportToFile } from '@os.io/nest-kit/infra/excel';

const users = [
  { name: 'Alice', email: 'alice@example.com', score: 95.5 },
  { name: 'Bob', email: 'bob@example.com', score: 87.0 },
];

const buffer = await exportToBuffer(users);
await exportToFile(users, './report.xlsx');
```

### Import

```typescript
import { importFromBuffer, importFromFile } from '@os.io/nest-kit/infra/excel';

const rows = await importFromFile('./data.xlsx');
const rows = await importFromBuffer(uploadedFile.buffer);
// rows → [{ name: 'Alice', email: 'alice@example.com', ... }, ...]
```

---

## Export

### Output Formats

**Buffer** — upload to S3, MinIO, API response:

```typescript
const buffer = await exportToBuffer(data);
```

**File** — save to disk:

```typescript
await exportToFile(data, './report.xlsx');
```

**Stream** — pipe to HTTP response:

```typescript
import { Response } from 'express';

@Get('export')
async export(@Res() res: Response) {
  const stream = exportToStream(data);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
  stream.pipe(res);
}
```

**Base64** — embed in JSON or email:

```typescript
const b64 = await exportToBase64(data);
```

**Express / NestJS Response** — single call:

```typescript
import { Response } from 'express';

@Get('download')
async download(@Res() res: Response) {
  const data = await this.service.findAll();
  await exportToResponse(data, res, 'users.xlsx');
}
```

### Column Definitions

Full `exceljs` Partial\<Column\> objects:

```typescript
import type { Column } from 'exceljs';

const columns: Partial<Column>[] = [
  { header: 'Full Name', key: 'name', width: 30 },
  { header: 'Email', key: 'email', width: 35 },
  { header: 'Score', key: 'score', width: 12, style: { numFmt: '#,##0.00' } },
];

const buffer = await exportToBuffer(users, { columns });
```

String shorthand (keys only):

```typescript
const buffer = await exportToBuffer(data, { columns: ['name', 'email', 'score'] });
```

Auto-detected from object keys when omitted.

### Header Style

Override with full `exceljs` `Style` type:

```typescript
import type { Style } from 'exceljs';

const buffer = await exportToBuffer(data, {
  headerStyle: {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12, name: 'Calibri' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F5496' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
});
```

### Per-column Cell Style

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

### Formatters

Transform cell values for display without mutating source data.

```typescript
const buffer = await exportToBuffer(data, {
  columns: ['name', 'active', 'salary'],
  formatters: {
    active: (v) => (v ? 'Active' : 'Inactive'),
    salary: (v) => `$${(v as number).toLocaleString()}`,
  },
});
```

### Exclude Columns

```typescript
const buffer = await exportToBuffer(data, { excludeColumns: ['internalId', 'hash'] });
```

### Auto-filter

Enabled by default. Set `useAutoFilter: false` to disable.

```typescript
await exportToBuffer(data, { useAutoFilter: false });
```

### Freeze Panes

```typescript
// Freeze first row
await exportToBuffer(data, { freezePane: 'A2' });

// Freeze first column
await exportToBuffer(data, { freezePane: 'B1' });

// Freeze first row + first column
await exportToBuffer(data, { freezePane: 'B2' });
```

### Multi-sheet Workbooks

```typescript
import { createBuilder } from '@os.io/nest-kit/infra/excel';

const wb = await createBuilder({ author: 'MyApp' })
  .addSheet('Users', users)
  .addSheet('Orders', orders, orderColumns)
  .build();

const buffer = await wb.toBuffer();
```

---

## Import

Parse `.xlsx` files back into arrays of objects.

### From Buffer

```typescript
const rows = await importFromBuffer(buf);
```

### From File

```typescript
const rows = await importFromFile('./data.xlsx');
```

### From URL

```typescript
const rows = await importFromUrl('https://example.com/data.xlsx');
```

### From Stream

```typescript
const rows = await importFromStream(readableStream);
```

### Options

```typescript
const rows = await importFromFile('./data.xlsx', {
  sheet: 'Sheet1', // or 0 (0-based index)
  headerRow: 1, // 0 = no header (returns indexed keys)
  skipEmpty: true, // skip rows where all cells are empty
  trim: true, // trim string values
});
```

---

## API

### Export Functions

| Function                           | Returns                  | Description                   |
| ---------------------------------- | ------------------------ | ----------------------------- |
| `exportToBuffer(data, opts?)`      | `Promise<Buffer>`        | Export to Node.js Buffer      |
| `exportToFile(data, path, opts?)`  | `Promise<void>`          | Write to disk                 |
| `exportToStream(data, opts?)`      | `PassThrough`            | Export as readable stream     |
| `exportToBase64(data, opts?)`      | `Promise<string>`        | Export as base64 string       |
| `exportToResponse(data, res, fn?)` | `Promise<void>`          | Send as HTTP download         |
| `buildWorkbook(data, opts?)`       | `Promise<ExcelWorkbook>` | Build a single-sheet workbook |
| `createBuilder(opts?)`             | `ExcelBuilder`           | Create multi-sheet builder    |

### Import Functions

| Function                          | Returns                              | Description             |
| --------------------------------- | ------------------------------------ | ----------------------- |
| `importFromBuffer(buf, opts?)`    | `Promise<Record<string, unknown>[]>` | Parse a Buffer          |
| `importFromFile(path, opts?)`     | `Promise<Record<string, unknown>[]>` | Parse a file from disk  |
| `importFromUrl(url, opts?)`       | `Promise<Record<string, unknown>[]>` | Fetch and parse a URL   |
| `importFromStream(stream, opts?)` | `Promise<Record<string, unknown>[]>` | Parse a readable stream |

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

### ExcelExportOptions

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

### ExcelImportOptions

| Param       | Type               | Default | Description                            |
| ----------- | ------------------ | ------- | -------------------------------------- |
| `sheet`     | `number \| string` | `0`     | Sheet index (0-based) or name          |
| `headerRow` | `number`           | `1`     | Row number of header (`0` = no header) |
| `skipEmpty` | `boolean`          | `true`  | Skip rows where all cells are empty    |
| `trim`      | `boolean`          | `true`  | Trim string cell values                |
