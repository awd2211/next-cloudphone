-- ================================================================================
-- 数据范围配置和字段权限配置初始化脚本
-- 云手机平台业务场景
-- ================================================================================

-- 清空现有配置（测试环境）
TRUNCATE TABLE data_scopes CASCADE;
TRUNCATE TABLE field_permissions CASCADE;

-- ================================================================================
-- 1. 数据范围配置 (Data Scopes)
-- ================================================================================

-- 1.1 管理员角色 (admin) - 数据范围配置
-- 管理员可以访问所有数据

-- 设备 - 全部数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001', -- admin role
  'device',
  'all',
  '管理员可以访问所有云手机设备数据',
  true,
  1,
  NOW(),
  NOW()
);

-- 用户 - 全部数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'user',
  'all',
  '管理员可以访问所有用户数据',
  true,
  1,
  NOW(),
  NOW()
);

-- 应用 - 全部数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'app',
  'all',
  '管理员可以访问所有应用数据',
  true,
  1,
  NOW(),
  NOW()
);

-- 订单 - 全部数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'order',
  'all',
  '管理员可以访问所有订单数据',
  true,
  1,
  NOW(),
  NOW()
);

-- 账单 - 全部数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'billing',
  'all',
  '管理员可以访问所有账单数据',
  true,
  1,
  NOW(),
  NOW()
);

-- 支付 - 全部数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'payment',
  'all',
  '管理员可以访问所有支付数据',
  true,
  1,
  NOW(),
  NOW()
);

-- 审计日志 - 全部数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'audit_log',
  'all',
  '管理员可以访问所有审计日志',
  true,
  1,
  NOW(),
  NOW()
);

-- 1.2 普通用户角色 (user) - 数据范围配置
-- 普通用户只能访问自己的数据

-- 设备 - 仅本人数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002', -- user role
  'device',
  'self',
  '普通用户只能访问自己创建的云手机设备',
  true,
  100,
  NOW(),
  NOW()
);

-- 用户 - 仅本人数据（只能查看和修改自己的信息）
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'user',
  'self',
  '普通用户只能访问自己的用户信息',
  true,
  100,
  NOW(),
  NOW()
);

-- 应用 - 租户数据（同租户的用户可以看到租户内的所有应用）
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'app',
  'tenant',
  '普通用户可以访问本租户的所有应用',
  true,
  100,
  NOW(),
  NOW()
);

-- 订单 - 仅本人数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'order',
  'self',
  '普通用户只能访问自己的订单',
  true,
  100,
  NOW(),
  NOW()
);

-- 账单 - 仅本人数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'billing',
  'self',
  '普通用户只能访问自己的账单',
  true,
  100,
  NOW(),
  NOW()
);

-- 支付 - 仅本人数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'payment',
  'self',
  '普通用户只能访问自己的支付记录',
  true,
  100,
  NOW(),
  NOW()
);

-- 审计日志 - 仅本人数据
INSERT INTO data_scopes (id, "roleId", "resourceType", "scopeType", description, "isActive", priority, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'audit_log',
  'self',
  '普通用户只能查看自己的操作日志',
  true,
  100,
  NOW(),
  NOW()
);

-- ================================================================================
-- 2. 字段权限配置 (Field Permissions)
-- ================================================================================

-- 2.1 管理员角色 (admin) - 字段权限配置
-- 管理员对所有字段有完全访问权限（通常不需要配置，默认就是全权限）
-- 但这里配置一些敏感字段的只读保护

-- 用户资源 - 查看操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'user',
  'view',
  NULL, -- 管理员可以查看所有字段
  ARRAY['password'], -- 密码字段即使管理员也不应该看到明文
  NULL,
  NULL,
  '管理员查看用户时，密码字段只读保护',
  true,
  1,
  NOW(),
  NOW()
);

-- 用户资源 - 创建操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'user',
  'create',
  NULL,
  ARRAY['id', 'createdAt', 'updatedAt'], -- 系统自动生成字段只读
  NULL,
  ARRAY['username', 'email', 'password'], -- 创建用户时必填
  '管理员创建用户的字段权限',
  true,
  1,
  NOW(),
  NOW()
);

-- 用户资源 - 更新操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'user',
  'update',
  NULL,
  ARRAY['id', 'username', 'createdAt', 'updatedAt'], -- ID和用户名不可修改
  NULL,
  NULL,
  '管理员更新用户时，ID和用户名不可修改',
  true,
  1,
  NOW(),
  NOW()
);

-- 设备资源 - 查看操作（管理员可以看到所有字段）
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'device',
  'view',
  NULL, -- 无隐藏字段
  NULL,
  NULL,
  NULL,
  '管理员可以查看设备的所有字段',
  true,
  1,
  NOW(),
  NOW()
);

-- 支付资源 - 查看操作（管理员可以查看所有支付信息）
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'payment',
  'view',
  NULL,
  NULL,
  NULL,
  NULL,
  '管理员可以查看所有支付信息',
  true,
  1,
  NOW(),
  NOW()
);

-- 2.2 普通用户角色 (user) - 字段权限配置
-- 普通用户的字段访问受限，很多敏感字段需要隐藏或只读

-- 用户资源 - 查看操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'user',
  'view',
  ARRAY['password', 'salt', 'twoFactorSecret', 'apiKey'], -- 隐藏敏感字段
  ARRAY['id', 'username', 'email', 'tenantId', 'createdAt', 'updatedAt', 'lastLoginAt', 'lastLoginIp'], -- 只读字段
  NULL,
  NULL,
  '普通用户查看自己的信息时，隐藏密码等敏感信息',
  true,
  100,
  NOW(),
  NOW()
);

-- 用户资源 - 更新操作（用户只能更新有限字段）
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'user',
  'update',
  ARRAY['password', 'salt', 'twoFactorSecret', 'apiKey'],
  ARRAY['id', 'username', 'email', 'tenantId', 'createdAt', 'updatedAt', 'status', 'roles'],
  ARRAY['fullName', 'avatar', 'phone', 'locale', 'timezone'], -- 用户只能修改这些字段
  NULL,
  '普通用户更新信息时只能修改昵称、头像等非敏感字段',
  true,
  100,
  NOW(),
  NOW()
);

-- 设备资源 - 查看操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'device',
  'view',
  ARRAY['internalIp', 'containerId', 'nodeId'], -- 隐藏内部技术字段
  ARRAY['id', 'userId', 'tenantId', 'createdAt', 'updatedAt', 'status'],
  NULL,
  NULL,
  '普通用户查看设备时，隐藏内部技术字段',
  true,
  100,
  NOW(),
  NOW()
);

-- 设备资源 - 创建操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'device',
  'create',
  NULL,
  ARRAY['id', 'userId', 'tenantId', 'createdAt', 'updatedAt', 'status'],
  ARRAY['name', 'deviceType', 'osVersion', 'cpuCores', 'memoryMB', 'storageMB', 'region'], -- 用户可以配置这些字段
  ARRAY['name', 'deviceType'], -- 创建设备时必填字段
  '普通用户创建设备的字段权限',
  true,
  100,
  NOW(),
  NOW()
);

-- 设备资源 - 更新操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'device',
  'update',
  ARRAY['internalIp', 'containerId', 'nodeId'],
  ARRAY['id', 'userId', 'tenantId', 'deviceType', 'createdAt', 'updatedAt'], -- 设备类型等不可修改
  ARRAY['name', 'status', 'tags'], -- 用户只能修改名称、状态、标签
  NULL,
  '普通用户更新设备时，只能修改名称、状态和标签',
  true,
  100,
  NOW(),
  NOW()
);

-- 订单资源 - 查看操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'order',
  'view',
  NULL,
  ARRAY['id', 'userId', 'totalAmount', 'status', 'createdAt', 'updatedAt'], -- 所有字段只读
  NULL,
  NULL,
  '普通用户查看订单时，所有字段只读',
  true,
  100,
  NOW(),
  NOW()
);

-- 账单资源 - 查看操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'billing',
  'view',
  NULL,
  ARRAY['id', 'userId', 'amount', 'balance', 'status', 'createdAt'], -- 账单信息只读
  NULL,
  NULL,
  '普通用户查看账单时，所有字段只读',
  true,
  100,
  NOW(),
  NOW()
);

-- 支付资源 - 查看操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'payment',
  'view',
  ARRAY['paymentSecret', 'merchantKey', 'internalTransactionId'], -- 隐藏支付敏感信息
  ARRAY['id', 'userId', 'amount', 'status', 'paymentMethod', 'createdAt'],
  NULL,
  NULL,
  '普通用户查看支付记录时，隐藏敏感支付信息',
  true,
  100,
  NOW(),
  NOW()
);

-- 应用资源 - 查看操作
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'app',
  'view',
  ARRAY['uploadUserId', 'internalPath', 'storageKey'], -- 隐藏内部字段
  ARRAY['id', 'packageName', 'version', 'size', 'uploadedAt'],
  NULL,
  NULL,
  '普通用户查看应用时，隐藏内部存储字段',
  true,
  100,
  NOW(),
  NOW()
);

-- 审计日志 - 查看操作（普通用户只能查看有限的审计日志字段）
INSERT INTO field_permissions (
  id, "roleId", "resourceType", operation,
  "hiddenFields", "readOnlyFields", "writableFields", "requiredFields",
  description, "isActive", priority, "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'audit_log',
  'view',
  ARRAY['ip', 'userAgent', 'requestBody', 'responseBody'], -- 隐藏详细请求信息
  ARRAY['id', 'userId', 'action', 'resource', 'createdAt'],
  NULL,
  NULL,
  '普通用户查看审计日志时，隐藏详细请求信息',
  true,
  100,
  NOW(),
  NOW()
);

-- ================================================================================
-- 查询配置结果
-- ================================================================================

-- 查看数据范围配置统计
SELECT '数据范围配置统计' as "配置类型", COUNT(*) as "配置数量" FROM data_scopes;
SELECT r.name as "角色", COUNT(ds.id) as "配置数量"
FROM roles r
LEFT JOIN data_scopes ds ON r.id = ds."roleId"
GROUP BY r.id, r.name
ORDER BY r.name;

-- 查看字段权限配置统计
SELECT '字段权限配置统计' as "配置类型", COUNT(*) as "配置数量" FROM field_permissions;
SELECT r.name as "角色", COUNT(fp.id) as "配置数量"
FROM roles r
LEFT JOIN field_permissions fp ON r.id = fp."roleId"
GROUP BY r.id, r.name
ORDER BY r.name;

-- 查看详细配置（数据范围）
SELECT
  r.name as "角色",
  ds."resourceType" as "资源类型",
  ds."scopeType" as "范围类型",
  ds.description as "描述",
  ds."isActive" as "启用"
FROM data_scopes ds
JOIN roles r ON ds."roleId" = r.id
ORDER BY r.name, ds."resourceType";

-- 查看详细配置（字段权限）
SELECT
  r.name as "角色",
  fp."resourceType" as "资源类型",
  fp.operation as "操作",
  array_length(fp."hiddenFields", 1) as "隐藏字段数",
  array_length(fp."readOnlyFields", 1) as "只读字段数",
  array_length(fp."writableFields", 1) as "可写字段数",
  array_length(fp."requiredFields", 1) as "必填字段数",
  fp.description as "描述"
FROM field_permissions fp
JOIN roles r ON fp."roleId" = r.id
ORDER BY r.name, fp."resourceType", fp.operation;
