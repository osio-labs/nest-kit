import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WebhookHashAlgorithm, HmacResult } from './webhook.types.js';

/**
 * Sign a payload using HMAC.
 */
export function signPayload(
  payload: string | Buffer,
  secret: string,
  algorithm: WebhookHashAlgorithm = 'sha256',
): HmacResult {
  const hmac = createHmac(algorithm, secret);
  hmac.update(typeof payload === 'string' ? payload : payload.toString('utf8'));
  const signature = hmac.digest('hex');

  return { signature, algorithm };
}

/**
 * Verify an HMAC signature against a payload.
 */
export function verifySignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: WebhookHashAlgorithm = 'sha256',
): boolean {
  const expected = signPayload(payload, secret, algorithm).signature;

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Compute the expected header name for a given algorithm.
 */
export function signatureHeaderName(algorithm: WebhookHashAlgorithm): string {
  return `x-hub-signature-${algorithm}`;
}

/**
 * Generate a signature header value compatible with GitHub-style webhooks.
 */
export function buildSignatureHeader(
  payload: string | Buffer,
  secret: string,
  algorithm: WebhookHashAlgorithm = 'sha256',
): string {
  const { signature } = signPayload(payload, secret, algorithm);
  return `${algorithm === 'sha1' ? 'sha1' : 'sha256'}=${signature}`;
}

/**
 * Parse and verify a GitHub-style signature header value.
 */
export function parseSignatureHeader(
  header: string,
): { algorithm: WebhookHashAlgorithm; signature: string } | null {
  const match = /^(sha256|sha1)=([a-f0-9]+)$/i.exec(header.trim());
  if (!match) return null;

  return {
    algorithm: match[1] as WebhookHashAlgorithm,
    signature: match[2],
  };
}
