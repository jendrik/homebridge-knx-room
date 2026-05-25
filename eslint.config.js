import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'curly': ['warn', 'all'],
      'eqeqeq': 'warn',
      'max-len': ['warn', { code: 140 }],
      'no-console': 'warn',
      'no-trailing-spaces': 'warn',
      'prefer-arrow-callback': 'warn',
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'always'],
    },
  },
);
