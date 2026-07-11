import { readFileSync, unlinkSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Writable } from 'node:stream';
import {
  exportToBuffer,
  exportToFile,
  exportToStream,
  exportToBase64,
  exportToResponse,
  buildWorkbook,
  createBuilder,
} from './excel.export.js';
import type { Column } from 'exceljs';

describe('excel.export', () => {
  const sampleData = [
    { id: 1, name: 'Alice', email: 'alice@example.com', score: 95.5 },
    { id: 2, name: 'Bob', email: 'bob@example.com', score: 87.0 },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', score: 92.3 },
  ];

  describe('exportToBuffer', () => {
    it('should create a buffer from an array of objects', async () => {
      const buffer = await exportToBuffer(sampleData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('exportToFile', () => {
    it('should write to a file on disk', async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'excel-test-'));
      const filePath = join(tmpDir, 'test-output.xlsx');

      try {
        await exportToFile(sampleData, filePath);
        expect(existsSync(filePath)).toBe(true);
        const stat = readFileSync(filePath);
        expect(stat.length).toBeGreaterThan(0);
      } finally {
        unlinkSync(filePath);
      }
    });
  });

  describe('exportToStream', () => {
    it('should produce a readable stream', async () => {
      const stream = exportToStream(sampleData);
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      const result = Buffer.concat(chunks);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('exportToBase64', () => {
    it('should encode as base64', async () => {
      const b64 = await exportToBase64(sampleData);
      expect(typeof b64).toBe('string');
      expect(b64.length).toBeGreaterThan(0);
    });
  });

  describe('exportToResponse', () => {
    it('should pipe workbook to a writable response', async () => {
      const chunks: Buffer[] = [];
      const res = new Writable({
        write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void) {
          chunks.push(chunk);
          callback();
        },
      });
      res.setHeader = jest.fn();

      await exportToResponse(sampleData, res, 'report.xlsx');

      const result = Buffer.concat(chunks);
      expect(result.length).toBeGreaterThan(0);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="report.xlsx"',
      );
    });

    it('should use default filename when none provided', async () => {
      const chunks: Buffer[] = [];
      const res = new Writable({
        write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void) {
          chunks.push(chunk);
          callback();
        },
      });
      res.setHeader = jest.fn();

      await exportToResponse(sampleData, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="export.xlsx"',
      );
    });
  });

  describe('columns', () => {
    it('should respect custom column definitions', async () => {
      const columns: Partial<Column>[] = [
        { header: 'Full Name', key: 'name', width: 30 },
        { header: 'Email Address', key: 'email', width: 40 },
      ];

      const buffer = await exportToBuffer(sampleData, {
        sheetName: 'Users',
        columns,
      });

      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should accept string column shorthand', async () => {
      const buffer = await exportToBuffer(sampleData, {
        columns: ['name', 'email'],
      });

      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('empty data', () => {
    it('should handle empty data array', async () => {
      const buffer = await exportToBuffer([]);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle single object', async () => {
      const buffer = await exportToBuffer([{ a: 1, b: 'test' }]);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('formatters', () => {
    it('should apply global formatters to cells', async () => {
      const data = [
        { name: 'Alice', active: true, salary: 50000 },
        { name: 'Bob', active: false, salary: 75000 },
      ];

      const buffer = await exportToBuffer(data, {
        columns: ['name', 'active', 'salary'],
        formatters: {
          active: (v) => (v ? 'Active' : 'Inactive'),
          salary: (v) => `$${(v as number).toLocaleString()}`,
        },
      });

      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('useAutoFilter', () => {
    it('should disable auto-filter when useAutoFilter is false', async () => {
      const buffer = await exportToBuffer(sampleData, {
        useAutoFilter: false,
      });

      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('freezePane', () => {
    it('should freeze top row with A2', async () => {
      const buffer = await exportToBuffer(sampleData, { freezePane: 'A2' });
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should freeze first column with B1', async () => {
      const buffer = await exportToBuffer(sampleData, { freezePane: 'B1' });
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should freeze both row and column with B2', async () => {
      const buffer = await exportToBuffer(sampleData, { freezePane: 'B2' });
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('buildWorkbook', () => {
    it('should return an ExcelWorkbook', async () => {
      const wb = await buildWorkbook(sampleData);
      const buffer = await wb.toBuffer();
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('createBuilder (multi-sheet)', () => {
    it('should build a multi-sheet workbook', async () => {
      const users = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const orders = [
        { orderId: 'ORD-001', total: 150.0 },
        { orderId: 'ORD-002', total: 250.0 },
      ];

      const wb = await createBuilder({ author: 'Test' })
        .addSheet('Users', users)
        .addSheet('Orders', orders)
        .build();

      const buffer = await wb.toBuffer();
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle addSheet with columns', async () => {
      const data = [{ x: 1, y: 2 }];
      const columns: Partial<Column>[] = [{ header: 'X Value', key: 'x', width: 15 }];

      const wb = await createBuilder().addSheet('Data', data, columns).build();

      const buffer = await wb.toBuffer();
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle builder with no sheets added', async () => {
      const wb = await createBuilder().build();
      const buffer = await wb.toBuffer();
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('number formatting', () => {
    it('should apply number format to cells', async () => {
      const data = [
        { amount: 1234.5, date: '2024-01-15' },
        { amount: 5678.9, date: '2024-06-20' },
      ];

      const columns: Partial<Column>[] = [
        { header: 'Amount', key: 'amount', width: 15, style: { numFmt: '#,##0.00' } },
        { header: 'Date', key: 'date', width: 15 },
      ];

      const buffer = await exportToBuffer(data, { columns });
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('excludeColumns', () => {
    it('should omit specified columns from the output', async () => {
      const buffer = await exportToBuffer(sampleData, {
        excludeColumns: ['id', 'score'],
      });

      // Round-trip to verify excluded columns are actually missing
      const { importFromBuffer } = await import('./excel.import.js');
      const rows = await importFromBuffer(buffer);

      expect(rows).toHaveLength(3);
      expect(Object.keys(rows[0])).toEqual(['Name', 'Email']);
      expect(rows[0]).toHaveProperty('Name', 'Alice');
      expect(rows[0]).toHaveProperty('Email', 'alice@example.com');
      expect(rows[0]).not.toHaveProperty('Id');
      expect(rows[0]).not.toHaveProperty('Score');
    });
  });
});
