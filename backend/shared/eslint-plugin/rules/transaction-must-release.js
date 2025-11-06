/**
 * ESLint Rule: transaction-must-release
 *
 * 检测 QueryRunner 是否正确释放
 *
 * ❌ 错误示例:
 * async createUser() {
 *   const queryRunner = this.dataSource.createQueryRunner();
 *   await queryRunner.connect();
 *   await queryRunner.startTransaction();
 *   try {
 *     await queryRunner.commitTransaction();
 *   } catch (error) {
 *     await queryRunner.rollbackTransaction();
 *   }
 *   // ❌ 缺少 finally 块释放连接
 * }
 *
 * ✅ 正确示例:
 * async createUser() {
 *   const queryRunner = this.dataSource.createQueryRunner();
 *   await queryRunner.connect();
 *   await queryRunner.startTransaction();
 *   try {
 *     await queryRunner.commitTransaction();
 *   } catch (error) {
 *     await queryRunner.rollbackTransaction();
 *   } finally {
 *     await queryRunner.release();  // ✅
 *   }
 * }
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'QueryRunner 必须在 finally 块中释放',
      category: 'Transaction Governance',
      recommended: true,
    },
    messages: {
      missingFinally: 'QueryRunner 必须在 finally 块中释放。使用 finally { await queryRunner.release(); }',
      missingRelease: 'finally 块中缺少 queryRunner.release() 调用',
    },
    fixable: 'code',
    schema: [],
  },

  create(context) {
    return {
      // 检测变量声明: const queryRunner = ...createQueryRunner()
      VariableDeclarator(node) {
        // 检查是否是 queryRunner 变量
        if (
          node.id.type === 'Identifier' &&
          node.id.name === 'queryRunner' &&
          node.init &&
          node.init.type === 'CallExpression'
        ) {
          // 找到包含此变量的函数
          let functionNode = node;
          while (functionNode && functionNode.type !== 'FunctionDeclaration' && functionNode.type !== 'ArrowFunctionExpression' && functionNode.type !== 'FunctionExpression') {
            functionNode = functionNode.parent;
          }

          if (!functionNode) return;

          // 检查函数体中是否有 try-catch-finally
          const functionBody = functionNode.body;
          if (functionBody.type !== 'BlockStatement') return;

          let hasTryCatchFinally = false;
          let hasReleaseInFinally = false;

          // 遍历函数体的语句
          for (const statement of functionBody.body) {
            if (statement.type === 'TryStatement') {
              // 检查是否有 finally 块
              if (statement.finalizer) {
                hasTryCatchFinally = true;

                // 检查 finally 块中是否有 queryRunner.release()
                const finallyBody = statement.finalizer.body;
                for (const finallyStatement of finallyBody) {
                  if (
                    finallyStatement.type === 'ExpressionStatement' &&
                    finallyStatement.expression.type === 'AwaitExpression' &&
                    finallyStatement.expression.argument.type === 'CallExpression' &&
                    finallyStatement.expression.argument.callee.type === 'MemberExpression' &&
                    finallyStatement.expression.argument.callee.object.name === 'queryRunner' &&
                    finallyStatement.expression.argument.callee.property.name === 'release'
                  ) {
                    hasReleaseInFinally = true;
                    break;
                  }
                }
              }
            }
          }

          // 报告错误
          if (!hasTryCatchFinally) {
            context.report({
              node: node,
              messageId: 'missingFinally',
            });
          } else if (!hasReleaseInFinally) {
            context.report({
              node: node,
              messageId: 'missingRelease',
            });
          }
        }
      },
    };
  },
};
