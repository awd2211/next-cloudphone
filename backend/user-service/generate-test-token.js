const jwt = require('jsonwebtoken');

const payload = {
  sub: 'b08ca16e-9db0-43b7-9f85-f331491800a5',
  username: 'tenant_admin',
  email: 'tenant_admin@test.com',
  permissions: ['device:read', 'device:stats', 'scheduler:*', 'user.read', 'app.read', 'billing:read', 'billing:update'],
};

const token = jwt.sign(payload, 'dev-secret-key-change-in-production', {
  expiresIn: '24h',
  issuer: 'cloudphone-platform',
  audience: 'cloudphone-users',
});

console.log(token);
