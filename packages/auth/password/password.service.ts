import { Injectable } from '@nestjs/common';

/**
 * Service for hashing and verifying passwords using bcrypt.
 *
 * Uses dynamic import of `bcrypt` so the dependency is optional.
 * If `bcrypt` is not installed, operations throw a descriptive error.
 */
@Injectable()
export class PasswordService {
  private bcrypt: typeof import('bcrypt') | null = null;
  private resolved = false;

  /**
   * Hash a plaintext password.
   *
   * @param password - Plaintext password
   * @param rounds   - Cost factor (default 12)
   */
  async hash(password: string, rounds = 12): Promise<string> {
    const bcrypt = await this.loadBcrypt();
    return bcrypt.hash(password, rounds);
  }

  /**
   * Compare a plaintext password against a stored hash.
   */
  async verify(password: string, hash: string): Promise<boolean> {
    const bcrypt = await this.loadBcrypt();
    return bcrypt.compare(password, hash);
  }

  private async loadBcrypt(): Promise<typeof import('bcrypt')> {
    if (!this.resolved) {
      try {
        this.bcrypt = await import('bcrypt');
      } catch {
        throw new Error(
          'PasswordService requires the "bcrypt" package. ' +
            'Run: npm install bcrypt && npm install -D @types/bcrypt',
        );
      }
      this.resolved = true;
    }
    return this.bcrypt!;
  }
}
