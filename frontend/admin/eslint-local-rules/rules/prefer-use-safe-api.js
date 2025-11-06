/**
 * ESLint 规则: prefer-use-safe-api
 *
 * 推荐使用 useSafeApi 而不是手动的 Array.isArray() 检查。
 *
 * ❌ Discouraged:
 * const res = await getUsers();
 * setUsers(Array.isArray(res) ? res : []);
 *
 * ✅ Preferred:
 * const { data: users } = useSafeApi(getUsers, z.array(UserSchema), {
 *   fallbackValue: []
 * });
 *
 * @type {import('eslint').Rule.RuleModule}
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: '推荐使用 useSafeApi 替代手动 Array.isArray() 检查',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: null,
    schema: [],
    messages: {
      preferUseSafeApi:
        '建议使用 useSafeApi 替代手动 Array.isArray() 检查，提供更强的运行时类型安全和更好的错误处理。',
      manualArrayCheck:
        '检测到手动 Array.isArray() 检查。考虑重构为 useSafeApi + Zod schema 以获得更好的类型安全。',
    },
  },

  create(context) {
    /**
     * 检测手动的 Array.isArray() 三元表达式模式
     */
    function isManualArrayCheck(node) {
      // 检测: Array.isArray(res) ? res : []
      if (node.type === 'ConditionalExpression') {
        const test = node.test;
        const consequent = node.consequent;
        const alternate = node.alternate;

        // 检测 test 是否是 Array.isArray()
        if (
          test.type === 'CallExpression' &&
          test.callee.type === 'MemberExpression' &&
          test.callee.object.name === 'Array' &&
          test.callee.property.name === 'isArray'
        ) {
          // 检测 consequent 是被检查的变量
          // 检测 alternate 是空数组
          if (
            consequent.type === 'Identifier' &&
            alternate.type === 'ArrayExpression' &&
            alternate.elements.length === 0
          ) {
            return true;
          }
        }
      }

      return false;
    }

    /**
     * 检测是否在 useState setter 中使用
     */
    function isInSetterCall(node) {
      let parent = node.parent;

      while (parent) {
        if (
          parent.type === 'CallExpression' &&
          parent.callee.type === 'Identifier' &&
          /^set[A-Z]/.test(parent.callee.name)
        ) {
          return true;
        }
        parent = parent.parent;
      }

      return false;
    }

    return {
      ConditionalExpression(node) {
        if (isManualArrayCheck(node) && isInSetterCall(node)) {
          context.report({
            node,
            messageId: 'manualArrayCheck',
          });
        }
      },

      // 检测 try-catch 中的手动验证模式
      TryStatement(node) {
        const tryBlock = node.block;
        const catchClause = node.handler;

        if (!catchClause) return;

        // 检查 catch 块中是否有重置为空数组的模式
        const catchBody = catchClause.body.body;
        const hasArrayReset = catchBody.some((statement) => {
          return (
            statement.type === 'ExpressionStatement' &&
            statement.expression.type === 'CallExpression' &&
            statement.expression.callee.type === 'Identifier' &&
            /^set[A-Z]/.test(statement.expression.callee.name) &&
            statement.expression.arguments[0]?.type === 'ArrayExpression' &&
            statement.expression.arguments[0].elements.length === 0
          );
        });

        // 检查 try 块中是否有 await API 调用
        const hasAwaitApiCall = tryBlock.body.some((statement) => {
          if (statement.type === 'VariableDeclaration') {
            return statement.declarations.some((declarator) => {
              return (
                declarator.init &&
                declarator.init.type === 'AwaitExpression' &&
                declarator.init.argument.type === 'CallExpression'
              );
            });
          }
          return false;
        });

        if (hasArrayReset && hasAwaitApiCall) {
          context.report({
            node: tryBlock,
            messageId: 'preferUseSafeApi',
          });
        }
      },
    };
  },
};
