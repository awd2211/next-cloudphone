/**
 * 自定义 ESLint 规则 - 检测不安全的数组赋值和 API 调用
 *
 * 规则列表:
 * - no-unsafe-array-assignment: 检测直接赋值 API 响应而不验证
 * - prefer-use-safe-api: 推荐使用 useSafeApi 而不是手动验证
 */

import noUnsafeArrayAssignment from './rules/no-unsafe-array-assignment.js';
import preferUseSafeApi from './rules/prefer-use-safe-api.js';

export default {
  'no-unsafe-array-assignment': noUnsafeArrayAssignment,
  'prefer-use-safe-api': preferUseSafeApi,
};
