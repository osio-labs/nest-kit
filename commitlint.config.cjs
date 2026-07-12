/**
 * Commitlint configuration — enforces Conventional Commits.
 *
 * @see https://commitlint.js.org/
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'chore',
        'docs',
        'refactor',
        'test',
        'style',
        'perf',
        'ci',
        'build',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'root',
        'core',
        'bootstrap',
        'auth',
        'saas',
        'infra',
        'docs',
        'release',
        'deps',
      ],
    ],
    'subject-case': [2, 'always', 'lower-case'],
  },
};
