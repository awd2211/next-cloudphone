/**
 * ESLint 规则: no-unsafe-array-assignment
 *
 * 检测不安全的数组赋值模式，防止运行时错误。
 *
 * ❌ Bad:
 * setUsers(await getUsers());
 * setDevices(response.data);
 * setItems(apiResponse);
 *
 * ✅ Good:
 * setUsers(Array.isArray(res) ? res : []);
 * const { data } = useSafeApi(getUsers, Schema, { fallbackValue: [] });
 * setUsers([]);
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: '检测不安全的数组赋值，要求使用 useSafeApi 或 Array.isArray() 验证',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      unsafeArrayAssignment:
        '不安全的数组赋值。建议使用 useSafeApi 或 Array.isArray() 验证。',
      preferUseSafeApi:
        '建议使用 useSafeApi hook 进行 API 调用，提供运行时 Zod 验证和自动错误处理。',
    },
  },

  create(context) {
    // ESLint 9 API - 获取 sourceCode
    const sourceCode = context.sourceCode || context.getSourceCode();

    // 存储函数中的 useSafeApi 使用情况
    const useSafeApiUsage = new Set();

    // 检测可能不安全的标识符模式
    const UNSAFE_PATTERNS = [
      /response/i,
      /^res$/,
      /^data$/,
      /result/i,
      /apiResponse/i,
      /^api[A-Z]/,
      /await\s+/,
    ];

    /**
     * 检测是否是不安全的赋值
     */
    function isUnsafeAssignment(node) {
      // 1. 检测 setter 函数调用（如 setUsers, setDevices）
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        /^set[A-Z]/.test(node.callee.name)
      ) {
        const arg = node.arguments[0];
        if (!arg) return false;

        // 允许字面量数组
        if (arg.type === 'ArrayExpression') return false;

        // 允许 Array.isArray() 三元表达式
        if (arg.type === 'ConditionalExpression') {
          const test = arg.test;
          if (
            test.type === 'CallExpression' &&
            test.callee.type === 'MemberExpression' &&
            test.callee.object.name === 'Array' &&
            test.callee.property.name === 'isArray'
          ) {
            return false;
          }
        }

        // 允许从 useSafeApi 返回的 data
        if (arg.type === 'Identifier') {
          // 检查是否来自 useSafeApi 的解构
          const scope = sourceCode.getScope(node);
          const variable = scope.set.get(arg.name);
          if (variable) {
            const defs = variable.defs;
            if (defs.length > 0) {
              const def = defs[0];
              // 检查是否从 useSafeApi 解构
              if (
                def.node.type === 'VariableDeclarator' &&
                def.node.init &&
                def.node.init.type === 'CallExpression' &&
                def.node.init.callee.name === 'useSafeApi'
              ) {
                return false;
              }
            }
          }
        }

        // 检测不安全的标识符或表达式
        if (arg.type === 'Identifier' || arg.type === 'MemberExpression') {
          const argName = sourceCode.getText(arg);

          // 检测是否匹配不安全模式
          for (const pattern of UNSAFE_PATTERNS) {
            if (pattern.test(argName)) {
              return true;
            }
          }
        }

        // 检测 await 表达式（直接使用 API 返回值）
        if (arg.type === 'AwaitExpression') {
          return true;
        }
      }

      return false;
    }

    return {
      // 跟踪 useSafeApi 的使用
      VariableDeclarator(node) {
        if (
          node.init &&
          node.init.type === 'CallExpression' &&
          node.init.callee.name === 'useSafeApi'
        ) {
          if (node.id.type === 'ObjectPattern') {
            node.id.properties.forEach((prop) => {
              if (prop.type === 'Property' && prop.value.type === 'Identifier') {
                useSafeApiUsage.add(prop.value.name);
              }
            });
          }
        }
      },

      // 检查调用表达式
      CallExpression(node) {
        if (isUnsafeAssignment(node)) {
          context.report({
            node,
            messageId: 'unsafeArrayAssignment',
          });
        }

        // 检测直接调用 API 而不使用 useSafeApi
        if (
          node.callee.type === 'Identifier' &&
          /^(get|fetch|load)[A-Z]/.test(node.callee.name)
        ) {
          // 检查是否在 useSafeApi 内部调用
          let parent = node.parent;
          let inUseSafeApi = false;

          while (parent) {
            if (
              parent.type === 'CallExpression' &&
              parent.callee.name === 'useSafeApi'
            ) {
              inUseSafeApi = true;
              break;
            }
            parent = parent.parent;
          }

          if (!inUseSafeApi) {
            // 检查是否在 async 函数中直接 await
            let asyncParent = node.parent;
            while (asyncParent) {
              if (
                asyncParent.type === 'AwaitExpression' &&
                asyncParent.parent.type === 'VariableDeclarator'
              ) {
                context.report({
                  node,
                  messageId: 'preferUseSafeApi',
                });
                break;
              }
              asyncParent = asyncParent.parent;
            }
          }
        }
      },
    };
  },
};
