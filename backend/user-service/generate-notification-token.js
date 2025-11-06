const jwt = require('jsonwebtoken');

const payload = {
  sub: '00000000-0000-0000-0000-000000000001',
  username: 'test-admin',
  email: 'test@example.com',
  permissions: [
    'notification.template-render',
    'notification.template-read',
    'notification:read',
    'notification:create',
    'notification:*'
  ],
};

const token = jwt.sign(payload, 'dev-secret-key-change-in-production', {
  expiresIn: '24h',
  issuer: 'cloudphone-platform',
  audience: 'cloudphone-users',
});

console.log(token);
