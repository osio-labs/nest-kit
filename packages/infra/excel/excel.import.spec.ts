import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PassThrough } from 'node:stream';
import { exportToBuffer } from './excel.export.js';
import { importFromBuffer, importFromFile, importFromStream } from './excel.import.js';

describe('excel.import', () => {
  const sampleData = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ];

  async function createExcelBuffer(): Promise<Buffer> {
    return exportToBuffer(sampleData);
  }

  describe('importFromBuffer', () => {
    it('should parse a buffer back to an array of objects', async () => {
      const buf = await createExcelBuffer();
      const result = await importFromBuffer(buf);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        Id: 1,
        Name: 'Alice',
        Email: 'alice@example.com',
      });
    });

    it('should handle empty sheet gracefully', async () => {
      const buf = await exportToBuffer([]);
      const result = await importFromBuffer(buf);
      expect(result).toEqual([]);
    });
  });

  describe('importFromFile', () => {
    it('should parse a file from disk', async () => {
      const buf = await createExcelBuffer();
      const tmpDir = mkdtempSync(join(tmpdir(), 'excel-import-'));
      const filePath = join(tmpDir, 'test.xlsx');
      writeFileSync(filePath, buf);

      const result = await importFromFile(filePath);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        Id: 1,
        Name: 'Alice',
        Email: 'alice@example.com',
      });
    });
  });

  describe('importFromStream', () => {
    it('should parse a stream', async () => {
      const buf = await createExcelBuffer();
      const stream = new PassThrough();
      stream.end(buf);

      const result = await importFromStream(stream);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        Id: 1,
        Name: 'Alice',
        Email: 'alice@example.com',
      });
    });
  });

  describe('options', () => {
    it('should read a specific sheet by name', async () => {
      const buf = await exportToBuffer(sampleData, { sheetName: 'MySheet' });
      const result = await importFromBuffer(buf, { sheet: 'MySheet' });
      expect(result).toHaveLength(3);
    });

    it('should read a specific sheet by index', async () => {
      const buf = await exportToBuffer(sampleData);
      const result = await importFromBuffer(buf, { sheet: 0 });
      expect(result).toHaveLength(3);
    });

    it('should return arrays when headerRow is 0', async () => {
      const buf = await createExcelBuffer();
      const result = await importFromBuffer(buf, { headerRow: 0 });

      expect(result).toHaveLength(4); // header + 3 data rows as arrays
      expect(result[0]).toMatchObject({ '0': 'Id', '1': 'Name', '2': 'Email' });
    });

    it('should skip empty rows by default', async () => {
      const buf = await exportToBuffer([{ x: 1 }, {}, { x: 2 }]);
      const result = await importFromBuffer(buf, {
        columns: ['x'],
      });

      // empty row should be skipped
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ X: 1 });
      expect(result[1]).toMatchObject({ X: 2 });
    });
  });
});
