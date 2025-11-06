const jwt = require('jsonwebtoken');

const JWT_SECRET = 'dev-secret-key-change-in-production';

// Super Admin
const superAdmin = jwt.sign({
  sub: '10000000-0000-0000-0000-000000000001',
  username: 'super-admin',
  email: 'super-admin@cloudphone.com',
  roles: [{ name: 'super_admin' }],
  permissions: ['device:read', 'device:create', 'device:update', 'device:delete']
}, JWT_SECRET, { expiresIn: '24h', issuer: 'cloudphone-platform', audience: 'cloudphone-users' });

// Tenant Admin
const tenantAdmin = jwt.sign({
  sub: '20000000-0000-0000-0000-000000000001',
  username: 'tenant-admin',
  email: 'tenant-admin@example.com',
  tenantId: 'tenant-001',
  roles: [{ name: 'tenant_admin' }],
  permissions: ['device:read', 'device:create']
}, JWT_SECRET, { expiresIn: '24h', issuer: 'cloudphone-platform', audience: 'cloudphone-users' });

// User
const user = jwt.sign({
  sub: '30000000-0000-0000-0000-000000000001',
  username: 'test-user',
  email: 'user@example.com',
  roles: [{ name: 'user' }],
  permissions: ['device:read', 'device:create']
}, JWT_SECRET, { expiresIn: '24h', issuer: 'cloudphone-platform', audience: 'cloudphone-users' });

console.log('SUPER_ADMIN=' + superAdmin);
console.log('TENANT_ADMIN=' + tenantAdmin);
console.log('USER=' + user);
