module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended'],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    // ===== NestJS 依赖注入相关规则 =====

    // 要求明确的函数返回类型
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',

    // 禁止推断类型 - 要求明确类型声明
    '@typescript-eslint/no-inferrable-types': 'off',

    // 禁止使用 any
    '@typescript-eslint/no-explicit-any': 'warn',

    // 未使用的变量（构造函数参数除外）
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        // 允许在构造函数中声明但不使用的参数（用于依赖注入）
        args: 'after-used',
      },
    ],

    // 要求接口名称有前缀 I
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'interface',
        format: ['PascalCase'],
        // 可选：要求接口以 I 开头（可根据团队习惯调整）
        // prefix: ['I'],
      },
    ],

    // 禁止空接口（除非用于扩展）
    '@typescript-eslint/no-empty-interface': [
      'error',
      {
        allowSingleExtends: true,
      },
    ],

    // ===== 代码质量规则 =====

    // 要求使用 const
    'prefer-const': 'error',

    // 禁止未使用的表达式
    'no-unused-expressions': 'off',
    '@typescript-eslint/no-unused-expressions': 'error',

    // 要求使用模板字符串
    'prefer-template': 'warn',

    // 禁止 console.log（开发时可以放宽）
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',

    // 要求使用 === 和 !==
    eqeqeq: ['error', 'always'],

    // ===== NestJS 特定规则 =====

    // 允许装饰器
    '@typescript-eslint/ban-types': [
      'error',
      {
        extendDefaults: true,
        types: {
          // 允许 Object 类型（但不推荐在依赖注入中使用）
          Object: false,
          '{}': false,
        },
      },
    ],

    // 要求在 class 成员之间有空行
    'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
  },
};
