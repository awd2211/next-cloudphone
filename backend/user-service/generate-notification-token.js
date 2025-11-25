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
