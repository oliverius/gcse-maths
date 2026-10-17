import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['src/vendor/**', 'node_modules/**', 'temp/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: {
      'no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/js/**/*.js', 'tests/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
];
