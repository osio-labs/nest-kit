import { STORAGE_MODULE_OPTIONS, STORAGE_MANAGER } from './storage.constants.js';

describe('storage constants', () => {
  it('should export STORAGE_MODULE_OPTIONS as a non-empty string', () => {
    expect(typeof STORAGE_MODULE_OPTIONS).toBe('string');
    expect(STORAGE_MODULE_OPTIONS.length).toBeGreaterThan(0);
  });

  it('should export STORAGE_MANAGER as a non-empty string', () => {
    expect(typeof STORAGE_MANAGER).toBe('string');
    expect(STORAGE_MANAGER.length).toBeGreaterThan(0);
  });

  it('should have distinct token values', () => {
    expect(STORAGE_MODULE_OPTIONS).not.toBe(STORAGE_MANAGER);
  });
});
