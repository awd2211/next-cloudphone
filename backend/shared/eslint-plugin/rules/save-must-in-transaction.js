/**
 * ESLint Rule: save-must-in-transaction
 *
 * 检测 repository.save() 或 manager.save() 是否在事务中
 *
 * ❌ 错误示例:
 * async createUser(dto: CreateUserDto) {
 *   return await this.repository.save(dto);  // ❌ 无事务保护
 * }
 *
 * ✅ 正确示例 1 (装饰器):
 * @Transaction()
 * async createUser(manager: EntityManager, dto: CreateUserDto) {
 *   return await manager.save(User, dto);  // ✅
 * }
 *
 * ✅ 正确示例 2 (手动事务):
 * async createUser(dto: CreateUserDto) {
 *   const queryRunner = this.dataSource.createQueryRunner();
 *   try {
 *     await queryRunner.startTransaction();
 *     await queryRunner.manager.save(User, dto);  // ✅
 *     await queryRunner.commitTransaction();
 *   } finally {
 *     await queryRunner.release();
 *   }
 * }
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'repository.save() 必须在事务中执行',
      category: 'Transaction Governance',
      recommended: true,
    },
    messages: {
      saveWithoutTransaction: '{{method}} 应该在事务中执行。使用 @Transaction() 装饰器或 QueryRunner',
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        // 检测 .save() 调用
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'save'
        ) {
          const objectName = node.callee.object.name;

          // 检查是否是 this.repository.save() 或 this.xxxRepository.save()
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

            // 检查是否在 queryRunner.manager.save() 中
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
                messageId: 'saveWithoutTransaction',
                data: {
                  method: `${node.callee.object.property.name}.save()`,
                },
              });
            }
          }
        }
      },
    };
  },
};
