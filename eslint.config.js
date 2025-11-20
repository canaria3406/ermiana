import google from 'eslint-config-google';

const googleRules = { ...google.rules };
delete googleRules['valid-jsdoc'];

export default [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      ...googleRules,
      'linebreak-style': 0,
      'require-jsdoc': 0,
      'max-len': 0,
      'object-curly-spacing': ['error', 'always'],
    },
  },
];
