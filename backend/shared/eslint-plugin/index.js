/**
 * ESLint Plugin for Cloud Phone Transaction Governance
 *
 * 自动检测事务相关的常见问题
 */

module.exports = {
  rules: {
    'transaction-must-release': require('./rules/transaction-must-release'),
    'save-must-in-transaction': require('./rules/save-must-in-transaction'),
    'update-must-in-transaction': require('./rules/update-must-in-transaction'),
    'delete-must-in-transaction': require('./rules/delete-must-in-transaction'),
    'outbox-with-transaction': require('./rules/outbox-with-transaction'),
    'no-external-service-in-transaction': require('./rules/no-external-service-in-transaction'),
  },
  configs: {
    recommended: {
      plugins: ['@cloudphone/transaction'],
      rules: {
        '@cloudphone/transaction/transaction-must-release': 'error',
        '@cloudphone/transaction/save-must-in-transaction': 'warn',
        '@cloudphone/transaction/update-must-in-transaction': 'warn',
        '@cloudphone/transaction/delete-must-in-transaction': 'warn',
        '@cloudphone/transaction/outbox-with-transaction': 'warn',
        '@cloudphone/transaction/no-external-service-in-transaction': 'warn',
      },
    },
  },
};
