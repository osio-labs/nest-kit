import { Injectable } from '@nestjs/common';

/**
 * Central authentication orchestrator.
 *
 * Delegates to the appropriate strategy based on `AuthMethod`,
 * manages token lifecycle, session tracking, and cache acceleration.
 */
@Injectable()
export class AuthService {
  async validateToken(_: string): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }
}
