import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
    },
    rules: {
      // ===== NestJS 依赖注入相关规则 =====

      // 禁止使用 any
      '@typescript-eslint/no-explicit-any': 'warn',

      // 未使用的变量（构造函数参数除外）
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          args: 'after-used',
        },
      ],

      // ===== 代码质量规则 =====

      // 要求使用 const
      'prefer-const': 'error',

      // 要求使用模板字符串
      'prefer-template': 'warn',

      // 禁止 console.log（开发时可以放宽）
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

      // 要求使用 === 和 !==
      eqeqeq: ['error', 'always'],

      // Prettier 集成
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', '*.config.js', '*.config.mjs'],
  },
];
