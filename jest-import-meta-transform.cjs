/**
 * Jest transformer that:
 *   1. Replaces `import.meta.url` with a CJS-safe polyfill
 *   2. Delegates to ts-jest for TypeScript compilation
 *
 * Needed because Jest 30 transform-chaining ("next") is broken with ts-jest 29.
 */
const { default: tsJest } = require('ts-jest');

const tsJestTransformer = tsJest.createTransformer();

module.exports = {
  process(src, filename, config, transformOptions) {
    if (!filename.endsWith('.ts') && !filename.endsWith('.mts')) {
      return undefined;
    }

    const patched = src.replace(
      /import\.meta\.url/g,
      `(new URL('file://' + __filename).href)`,
    );

    return tsJestTransformer.process(patched, filename, config, transformOptions);
  },
};
