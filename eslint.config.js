import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['deno/**', 'doc/**', 'node_modules/**', 'pic/**', 'workers/**'],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    rules: {
      // Google Style Guide rules
      'arrow-parens': ['error', 'always'],
      'brace-style': ['error', '1tbs'],
      'camelcase': ['error', { properties: 'never' }],
      'comma-dangle': ['error', 'always-multiline'],
      'comma-spacing': ['error', { before: false, after: true }],
      'curly': ['error', 'multi-line'],
      'eol-last': 'error',
      'indent': ['error', 2, { SwitchCase: 1 }],
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': 'error',
      'no-var': 'error',
      'object-curly-spacing': ['error', 'always'],
      'prefer-const': 'error',
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always',
      }],
      'space-infix-ops': 'error',

      // Project overrides
      'linebreak-style': 0,
      'require-jsdoc': 0,
      'max-len': 0,
      'new-cap': ['error', {
        capIsNewExceptions: ['Router'],
      }],
    },
  },
];
