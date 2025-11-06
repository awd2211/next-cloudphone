/**
 * ESLint Rule: no-external-service-in-transaction
 *
 * 检测事务方法中是否调用外部服务
 *
 * ❌ 错误示例:
 * @Transaction()
 * async createUser(manager: EntityManager, dto: CreateUserDto) {
 *   const user = await manager.save(User, dto);
 *   await this.emailService.sendWelcomeEmail(user.email);  // ❌ 外部服务在事务内
 *   return user;
 * }
 *
 * ✅ 正确示例:
 * @Transaction()
 * async saveUser(manager: EntityManager, dto: CreateUserDto) {
 *   return await manager.save(User, dto);
 * }
 *
 * async createUser(dto: CreateUserDto) {
 *   const user = await this.saveUser(dto);  // 事务方法
 *   try {
 *     await this.emailService.sendWelcomeEmail(user.email);  // ✅ 事务外
 *   } catch (error) {
 *     this.logger.warn('Email failed', error);
 *   }
 *   return user;
 * }
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '事务方法中不应调用外部服务',
      category: 'Transaction Governance',
      recommended: true,
    },
    messages: {
      externalServiceInTransaction:
        '事务方法中不应调用 {{service}}。外部服务（MinIO、邮件、短信）应该在事务外执行',
    },
    schema: [],
  },

  create(context) {
    // 外部服务关键词列表
    const externalServiceKeywords = [
      'emailService',
      'smsService',
      'minioService',
      's3Service',
      'httpService',
      'httpClient',
      'restClient',
      'apiClient',
      'fetch',
      'axios',
    ];

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

        // 检查方法体中是否有外部服务调用
        const checkExternalService = (n, path = []) => {
          if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression') {
            // 检查是否是 this.xxxService.yyy() 调用
            if (
              n.callee.object.type === 'MemberExpression' &&
              n.callee.object.object.type === 'ThisExpression' &&
              n.callee.object.property.type === 'Identifier'
            ) {
              const serviceName = n.callee.object.property.name;

              // 检查是否是外部服务
              for (const keyword of externalServiceKeywords) {
                if (serviceName.includes(keyword) || serviceName.endsWith('Client')) {
                  context.report({
                    node: n,
                    messageId: 'externalServiceInTransaction',
                    data: {
                      service: serviceName,
                    },
                  });
                  return;
                }
              }
            }

            // 检查是否是直接调用 fetch() 或 axios()
            if (n.callee.type === 'Identifier') {
              const functionName = n.callee.name;
              if (['fetch', 'axios'].includes(functionName)) {
                context.report({
                  node: n,
                  messageId: 'externalServiceInTransaction',
                  data: {
                    service: functionName,
                  },
                });
                return;
              }
            }
          }

          // 递归检查子节点
          for (const key in n) {
            if (n[key] && typeof n[key] === 'object') {
              if (Array.isArray(n[key])) {
                n[key].forEach((child) => checkExternalService(child, [...path, key]));
              } else {
                checkExternalService(n[key], [...path, key]);
              }
            }
          }
        };

        if (node.value && node.value.body) {
          checkExternalService(node.value.body);
        }
      },
    };
  },
};
