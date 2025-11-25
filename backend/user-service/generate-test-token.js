const jwt = require('jsonwebtoken');

const payload = {
  sub: 'b08ca16e-9db0-43b7-9f85-f331491800a5',
  username: 'tenant_admin',
  email: 'tenant_admin@test.com',
  permissions: ['device:read', 'device:stats', 'scheduler:*', 'user.read', 'app.read', 'billing:read', 'billing:update'],
};

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is required');
  process.exit(1);
}

const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: '24h',
  issuer: 'cloudphone-platform',
  audience: 'cloudphone-users',
});

console.log(token);
