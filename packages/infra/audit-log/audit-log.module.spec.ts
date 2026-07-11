import { AuditLogModule } from './audit-log.module.js';
import { AUDIT_LOG_MODULE_OPTIONS, AUDIT_LOG_REPOSITORY } from './audit-log.constants.js';
import { AuditLogService } from './audit-log.service.js';
import type { AuditLogRepository } from './audit-log.types.js';

describe('AuditLogModule', () => {
  describe('forRoot()', () => {
    it('should return a dynamic module with AuditLogService exported', () => {
      const mod = AuditLogModule.forRoot();
      expect(mod.module).toBe(AuditLogModule);
      expect(mod.exports).toContain(AuditLogService);
      expect(mod.global).toBe(true);
    });

    it('should include options provider', () => {
      const mod = AuditLogModule.forRoot({ captureRequestContext: false });
      const optionsProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === AUDIT_LOG_MODULE_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect(optionsProvider!.useValue).toEqual(
        expect.objectContaining({ captureRequestContext: false }),
      );
    });

    it('should use custom repository when provided', () => {
      const customRepo: AuditLogRepository = {
        save: jest.fn(),
        find: jest.fn(),
        count: jest.fn(),
        findById: jest.fn(),
      };

      const mod = AuditLogModule.forRoot({ repository: customRepo });
      const repoProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === AUDIT_LOG_REPOSITORY,
      );

      expect(repoProvider).toBeDefined();
      expect(repoProvider!.useValue).toBe(customRepo);
    });

    it('should set global to false when specified', () => {
      const mod = AuditLogModule.forRoot({ global: false });
      expect(mod.global).toBe(false);
    });
  });

  describe('forRootAsync()', () => {
    it('should return a dynamic module with async options provider', () => {
      const mod = AuditLogModule.forRootAsync({
        useFactory: () => ({ captureRequestContext: false }),
        inject: [],
      });

      expect(mod.module).toBe(AuditLogModule);
      expect(mod.exports).toContain(AuditLogService);

      const optionsProvider = (mod.providers ?? []).find(
        (p: any) => p.provide === AUDIT_LOG_MODULE_OPTIONS,
      );
      expect(optionsProvider).toBeDefined();
      expect(typeof optionsProvider!.useFactory).toBe('function');
    });

    it('should pass imports through', () => {
      const mod = AuditLogModule.forRootAsync({
        useFactory: () => ({}),
        inject: [],
        imports: [],
      });
      expect(mod.imports).toEqual([]);
    });
  });

  describe('forFeature()', () => {
    it('should return a module with AUDIT_LOG_REPOSITORY exported', () => {
      const mod = AuditLogModule.forFeature();
      expect(mod.module).toBe(AuditLogModule);
      expect(mod.exports).toContain(AUDIT_LOG_REPOSITORY);
    });
  });
});
