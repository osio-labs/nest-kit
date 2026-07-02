/**
 * Lazy-load the `stripe` SDK (optional peer dependency).
 *
 * Returns `any` because the module may or may not be installed
 * and TypeScript cannot resolve types for optional peer deps at
 * compile time.
 */
export async function loadStripe(): Promise<any> {
  try {
    return await import('stripe');
  } catch {
    throw new Error(
      'Cannot find module "stripe". Install the optional peer dependency:\n\n' +
        '  npm install stripe\n',
    );
  }
}
