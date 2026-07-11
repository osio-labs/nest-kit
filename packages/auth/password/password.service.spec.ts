import { PasswordService } from './password.service.js';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashedpassword'),
  compare: jest
    .fn()
    .mockImplementation((pw: string, hash: string) => Promise.resolve(pw === 'correct-password')),
}));

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  describe('hash', () => {
    it('should hash a password', async () => {
      const result = await service.hash('my-password');
      expect(result).toBe('$2b$12$hashedpassword');
    });

    it('should use custom rounds', async () => {
      const result = await service.hash('my-password', 10);
      expect(result).toBeDefined();
    });

    it('should throw if bcrypt is not installed', async () => {
      const svc = new PasswordService();
      // Simulate load failure
      Object.defineProperty(svc, 'loadBcrypt', {
        value: () => {
          throw new Error('bcrypt not found');
        },
      });
      await expect(svc.hash('pw')).rejects.toThrow('bcrypt');
    });
  });

  describe('verify', () => {
    it('should return true for correct password', async () => {
      const result = await service.verify('correct-password', '$2b$12$hashedpassword');
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const result = await service.verify('wrong-password', '$2b$12$hashedpassword');
      expect(result).toBe(false);
    });
  });
});
