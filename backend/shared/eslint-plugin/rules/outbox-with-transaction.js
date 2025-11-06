/**
 * ESLint Rule: outbox-with-transaction
 *
 * 检测 save/update/delete 是否发布 Outbox 事件
 *
 * ❌ 错误示例:
 * @Transaction()
 * async createUser(manager: EntityManager, dto: CreateUserDto) {
 *   return await manager.save(User, dto);
 *   // ❌ 缺少 @PublishEvent 装饰器或 eventOutboxService.writeEvent()
 * }
 *
 * ✅ 正确示例 1 (装饰器):
 * @Transaction()
 * @SimplePublishEvent('user', 'user.created')  // ✅
 * async createUser(manager: EntityManager, dto: CreateUserDto) {
 *   return await manager.save(User, dto);
 * }
 *
 * ✅ 正确示例 2 (手动):
 * @Transaction()
 * async createUser(manager: EntityManager, dto: CreateUserDto) {
 *   const user = await manager.save(User, dto);
 *   await this.eventOutboxService.writeEvent(...);  // ✅
 *   return user;
 * }
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '写操作应该发布 Outbox 事件',
      category: 'Transaction Governance',
      recommended: true,
    },
    messages: {
      missingOutbox: '{{operation}} 操作应该发布 Outbox 事件。使用 @PublishEvent 装饰器或 eventOutboxService.writeEvent()',
    },
    schema: [],
  },

  create(context) {
    return {
      MethodDefinition(node) {
        // 检查方法是否有 @Transaction 装饰器
        const hasTransactionDecorator =
          node.decorators &&
          node.decorators.some(
            (decorator) =>
              decorator.expression.type === 'Identifier' &&
              (decorator.expression.name === 'Transaction' || decorator.expression.name === 'Transactional')
          );

        if (!hasTransactionDecorator) return;

        // 检查是否有 @PublishEvent 装饰器
        const hasPublishEventDecorator =
          node.decorators &&
          node.decorators.some(
            (decorator) =>
              decorator.expression.type === 'Identifier' &&
              (decorator.expression.name === 'PublishEvent' ||
                decorator.expression.name === 'SimplePublishEvent' ||
                decorator.expression.name === 'DynamicPublishEvent' ||
                decorator.expression.name === 'BatchPublishEvents')
          );

        if (hasPublishEventDecorator) return;

        // 检查方法体中是否有 save/update/delete 操作
        let hasWriteOperation = false;
        let operationType = '';

        const checkNode = (n) => {
          if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression') {
            const methodName = n.callee.property.name;
            if (['save', 'update', 'delete'].includes(methodName)) {
              hasWriteOperation = true;
              operationType = methodName;
            }
          }
          // 递归检查子节点
          for (const key in n) {
            if (n[key] && typeof n[key] === 'object') {
              if (Array.isArray(n[key])) {
                n[key].forEach(checkNode);
              } else {
                checkNode(n[key]);
              }
            }
          }
        };

        if (node.value && node.value.body) {
          checkNode(node.value.body);
        }

        if (!hasWriteOperation) return;

        // 检查方法体中是否有 eventOutboxService.writeEvent() 调用
        let hasOutboxCall = false;

        const checkOutboxCall = (n) => {
          if (
            n.type === 'CallExpression' &&
            n.callee.type === 'MemberExpression' &&
            n.callee.object.type === 'MemberExpression' &&
            n.callee.object.object.type === 'ThisExpression' &&
            n.callee.object.property.name === 'eventOutboxService' &&
            n.callee.property.name === 'writeEvent'
          ) {
            hasOutboxCall = true;
          }
          // 递归检查子节点
          for (const key in n) {
            if (n[key] && typeof n[key] === 'object') {
              if (Array.isArray(n[key])) {
                n[key].forEach(checkOutboxCall);
              } else {
                checkOutboxCall(n[key]);
              }
            }
          }
        };

        if (node.value && node.value.body) {
          checkOutboxCall(node.value.body);
        }

        if (!hasOutboxCall) {
          context.report({
            node: node.key,
            messageId: 'missingOutbox',
            data: {
              operation: operationType,
            },
          });
        }
      },
    };
  },
};
