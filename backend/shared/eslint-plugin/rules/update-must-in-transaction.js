/**
 * ESLint Rule: update-must-in-transaction
 *
 * 检测 repository.update() 或 manager.update() 是否在事务中
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'repository.update() 必须在事务中执行',
      category: 'Transaction Governance',
      recommended: true,
    },
    messages: {
      updateWithoutTransaction: '{{method}} 应该在事务中执行。使用 @Transaction() 装饰器或 QueryRunner',
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        // 检测 .update() 调用
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'update'
        ) {
          // 检查是否是 this.repository.update() 或 this.xxxRepository.update()
          if (
            node.callee.object.type === 'MemberExpression' &&
            node.callee.object.object.type === 'ThisExpression' &&
            node.callee.object.property.name.endsWith('Repository')
          ) {
            // 检查方法是否有 @Transaction 装饰器
            let functionNode = node;
            while (functionNode && !['FunctionDeclaration', 'MethodDefinition', 'ArrowFunctionExpression'].includes(functionNode.type)) {
              functionNode = functionNode.parent;
            }

            if (!functionNode) return;

            // 检查是否有 @Transaction 装饰器
            const hasTransactionDecorator =
              functionNode.decorators &&
              functionNode.decorators.some(
                (decorator) =>
                  decorator.expression.type === 'Identifier' &&
                  (decorator.expression.name === 'Transaction' || decorator.expression.name === 'Transactional')
              );

            // 检查是否在 queryRunner.manager.update() 中
            const isInQueryRunner =
              node.callee.object.type === 'MemberExpression' &&
              node.callee.object.object.name === 'queryRunner' &&
              node.callee.object.property.name === 'manager';

            // 检查第一个参数是否是 EntityManager
            const hasEntityManagerParam =
              functionNode.params &&
              functionNode.params.length > 0 &&
              functionNode.params[0].typeAnnotation &&
              functionNode.params[0].typeAnnotation.typeAnnotation.typeName &&
              functionNode.params[0].typeAnnotation.typeAnnotation.typeName.name === 'EntityManager';

            if (!hasTransactionDecorator && !isInQueryRunner && !hasEntityManagerParam) {
              context.report({
                node: node,
                messageId: 'updateWithoutTransaction',
                data: {
                  method: `${node.callee.object.property.name}.update()`,
                },
              });
            }
          }
        }
      },
    };
  },
};
