-- ================================================================================
-- 云手机平台完整角色体系初始化脚本
-- ================================================================================

-- 注意：不删除现有的 admin 和 user 角色，只添加新角色
-- admin (00000000-0000-0000-0000-000000000001) - 系统管理员
-- user  (00000000-0000-0000-0000-000000000002) - 普通用户

-- ================================================================================
-- 1. 管理类角色 (Management Roles)
-- ================================================================================

-- 1.1 超级管理员 (Super Admin)
-- 已存在的 admin 角色，更新其描述和元数据
UPDATE roles
SET
  description = '超级管理员 - 拥有系统所有权限，可以管理所有资源和配置',
  metadata = jsonb_build_object(
    'level', 'super',
    'category', 'management',
    'permissions', ARRAY['*'],
    'features', ARRAY[
      '用户管理', '角色管理', '权限管理',
      '系统配置', '数据备份', '日志审计',
      '设备管理', '应用管理', '账单管理'
    ]
  )
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 1.2 租户管理员 (Tenant Admin)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'tenant_admin',
  '租户管理员 - 管理本租户的用户、设备和资源',
  true,
  jsonb_build_object(
    'level', 'tenant',
    'category', 'management',
    'scope', 'tenant',
    'features', ARRAY[
      '租户用户管理', '租户设备管理', '租户应用管理',
      '租户账单查看', '租户配额管理', '租户报表统计'
    ],
    'description', '企业租户的管理员，可以管理租户内的所有用户和资源，但不能访问其他租户数据'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- 1.3 部门管理员 (Department Admin)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000004',
  'department_admin',
  '部门管理员 - 管理本部门的用户和设备',
  true,
  jsonb_build_object(
    'level', 'department',
    'category', 'management',
    'scope', 'department',
    'features', ARRAY[
      '部门用户管理', '部门设备管理', '部门报表查看'
    ],
    'description', '部门负责人，可以管理本部门及子部门的用户和设备'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- ================================================================================
-- 2. 运营类角色 (Operations Roles)
-- ================================================================================

-- 2.1 运维工程师 (DevOps Engineer)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'devops',
  '运维工程师 - 负责系统运维、监控和故障处理',
  true,
  jsonb_build_object(
    'level', 'system',
    'category', 'operations',
    'scope', 'all',
    'features', ARRAY[
      '设备监控', '系统日志', '性能分析',
      '故障诊断', '备份恢复', '资源调度'
    ],
    'description', '负责平台的日常运维、监控告警、故障处理和性能优化'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- 2.2 客服专员 (Customer Service)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000006',
  'customer_service',
  '客服专员 - 处理用户咨询和工单',
  true,
  jsonb_build_object(
    'level', 'tenant',
    'category', 'operations',
    'scope', 'tenant',
    'features', ARRAY[
      '查看用户信息', '查看设备信息', '查看订单记录',
      '工单处理', '在线客服'
    ],
    'limitations', ARRAY[
      '不能修改用户密码', '不能查看支付密码',
      '不能删除数据', '不能修改账单'
    ],
    'description', '处理客户咨询、投诉和工单，可以查看用户和订单信息但权限受限'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- 2.3 审核专员 (Auditor)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000007',
  'auditor',
  '审核专员 - 负责应用审核和内容审核',
  true,
  jsonb_build_object(
    'level', 'system',
    'category', 'operations',
    'scope', 'all',
    'features', ARRAY[
      '应用审核', '内容审核', '用户审核',
      '审核记录', '审核统计'
    ],
    'description', '负责应用上架审核、用户内容审核等工作'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- ================================================================================
-- 3. 财务类角色 (Finance Roles)
-- ================================================================================

-- 3.1 财务专员 (Finance)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000008',
  'finance',
  '财务专员 - 管理账单、支付和财务报表',
  true,
  jsonb_build_object(
    'level', 'system',
    'category', 'finance',
    'scope', 'all',
    'features', ARRAY[
      '账单管理', '支付管理', '退款管理',
      '财务报表', '对账管理', '发票管理'
    ],
    'description', '负责财务管理、账单核对、支付处理和财务报表'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- 3.2 会计 (Accountant)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000009',
  'accountant',
  '会计 - 查看财务数据和报表',
  true,
  jsonb_build_object(
    'level', 'system',
    'category', 'finance',
    'scope', 'all',
    'features', ARRAY[
      '查看账单', '查看支付记录', '查看财务报表',
      '导出财务数据'
    ],
    'limitations', ARRAY[
      '不能修改账单', '不能执行退款',
      '不能修改支付记录'
    ],
    'description', '只读财务角色，可以查看和导出财务数据但不能修改'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- ================================================================================
-- 4. 业务类角色 (Business Roles)
-- ================================================================================

-- 4.1 普通用户 (Regular User)
-- 已存在的 user 角色，更新其描述和元数据
UPDATE roles
SET
  description = '普通用户 - 个人用户，可以创建和管理自己的云手机设备',
  metadata = jsonb_build_object(
    'level', 'user',
    'category', 'business',
    'scope', 'self',
    'features', ARRAY[
      '创建设备', '管理设备', '安装应用',
      '查看账单', '在线支付', '工单提交'
    ],
    'quotas', jsonb_build_object(
      'maxDevices', 10,
      'maxStorage', 102400,
      'maxCPU', 8,
      'maxMemory', 16384
    ),
    'description', '标准个人用户，可以创建和管理自己的云手机设备'
  )
WHERE id = '00000000-0000-0000-0000-000000000002';

-- 4.2 VIP用户 (VIP User)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'vip_user',
  'VIP用户 - 享有更高配额和优先支持',
  true,
  jsonb_build_object(
    'level', 'user',
    'category', 'business',
    'scope', 'self',
    'tier', 'vip',
    'features', ARRAY[
      '创建设备', '管理设备', '安装应用',
      '查看账单', '在线支付', '工单提交',
      '优先客服', '高级功能', '性能优化'
    ],
    'quotas', jsonb_build_object(
      'maxDevices', 50,
      'maxStorage', 512000,
      'maxCPU', 32,
      'maxMemory', 65536
    ),
    'benefits', ARRAY[
      '更高的设备配额', '更大的存储空间',
      '优先技术支持', '专属客服通道',
      '高级功能访问'
    ],
    'description', 'VIP用户享有更高的资源配额、优先技术支持和高级功能'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- 4.3 企业用户 (Enterprise User)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000011',
  'enterprise_user',
  '企业用户 - 企业员工，共享企业资源',
  true,
  jsonb_build_object(
    'level', 'user',
    'category', 'business',
    'scope', 'tenant',
    'tier', 'enterprise',
    'features', ARRAY[
      '创建设备', '管理设备', '安装应用',
      '共享应用库', '协作功能', '企业报表'
    ],
    'quotas', jsonb_build_object(
      'maxDevices', 20,
      'maxStorage', 204800,
      'maxCPU', 16,
      'maxMemory', 32768
    ),
    'description', '企业员工用户，可以使用企业资源和共享应用库'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- 4.4 开发者 (Developer)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000012',
  'developer',
  '开发者 - 应用开发者，可以上传和管理应用',
  true,
  jsonb_build_object(
    'level', 'user',
    'category', 'business',
    'scope', 'self',
    'tier', 'developer',
    'features', ARRAY[
      '创建设备', '管理设备', '上传应用',
      '应用管理', 'API访问', '开发者文档',
      '应用统计', '应用分发'
    ],
    'quotas', jsonb_build_object(
      'maxDevices', 30,
      'maxApps', 100,
      'maxStorage', 1024000,
      'apiRateLimit', 10000
    ),
    'description', '应用开发者，可以上传、管理和分发应用'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- ================================================================================
-- 5. 测试和特殊角色 (Test & Special Roles)
-- ================================================================================

-- 5.1 测试用户 (Test User)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000013',
  'test_user',
  '测试用户 - 用于测试环境，有限的权限',
  true,
  jsonb_build_object(
    'level', 'user',
    'category', 'test',
    'scope', 'self',
    'environment', 'test',
    'features', ARRAY[
      '创建测试设备', '测试应用安装'
    ],
    'quotas', jsonb_build_object(
      'maxDevices', 3,
      'maxStorage', 10240,
      'maxCPU', 4,
      'maxMemory', 4096
    ),
    'limitations', ARRAY[
      '仅测试环境可用', '设备自动清理',
      '不能访问生产数据'
    ],
    'description', '测试账号，用于功能测试和演示，资源配额较低'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- 5.2 只读用户 (Read-Only User)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000014',
  'readonly_user',
  '只读用户 - 只能查看数据，不能修改',
  true,
  jsonb_build_object(
    'level', 'user',
    'category', 'special',
    'scope', 'self',
    'features', ARRAY[
      '查看设备信息', '查看应用信息', '查看账单'
    ],
    'limitations', ARRAY[
      '不能创建设备', '不能修改数据',
      '不能删除资源', '不能执行操作'
    ],
    'description', '只读账号，仅用于数据查看和监控，不能执行任何修改操作'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- 5.3 访客 (Guest)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000015',
  'guest',
  '访客 - 临时访问权限，仅可浏览公开内容',
  true,
  jsonb_build_object(
    'level', 'guest',
    'category', 'special',
    'scope', 'public',
    'features', ARRAY[
      '浏览公开内容', '查看产品介绍', '查看文档'
    ],
    'limitations', ARRAY[
      '不能创建账号', '不能创建设备',
      '不能访问私有数据', '会话时效性'
    ],
    'description', '临时访客账号，仅可浏览公开内容，不能执行任何操作'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- ================================================================================
-- 6. 数据分析和报表角色 (Analytics Roles)
-- ================================================================================

-- 6.1 数据分析师 (Data Analyst)
INSERT INTO roles (id, name, description, "isSystem", metadata, "createdAt", "updatedAt")
VALUES (
  '00000000-0000-0000-0000-000000000016',
  'data_analyst',
  '数据分析师 - 访问数据报表和分析工具',
  true,
  jsonb_build_object(
    'level', 'system',
    'category', 'analytics',
    'scope', 'all',
    'features', ARRAY[
      '数据报表', '用户分析', '设备统计',
      '财务分析', '运营分析', '数据导出'
    ],
    'limitations', ARRAY[
      '只能查看数据', '不能修改数据',
      '不能访问敏感信息'
    ],
    'description', '负责数据分析和报表，可以访问汇总数据但不能查看个人敏感信息'
  ),
  NOW(),
  NOW()
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  "updatedAt" = NOW();

-- ================================================================================
-- 查询统计信息
-- ================================================================================

-- 统计各类角色数量
SELECT '角色统计' as "信息", COUNT(*) as "总数" FROM roles;

-- 按分类统计
SELECT
  metadata->>'category' as "角色分类",
  COUNT(*) as "数量",
  string_agg(name, ', ' ORDER BY name) as "角色列表"
FROM roles
WHERE metadata IS NOT NULL AND metadata ? 'category'
GROUP BY metadata->>'category'
ORDER BY COUNT(*) DESC;

-- 按等级统计
SELECT
  metadata->>'level' as "权限等级",
  COUNT(*) as "数量",
  string_agg(name, ', ' ORDER BY name) as "角色列表"
FROM roles
WHERE metadata IS NOT NULL AND metadata ? 'level'
GROUP BY metadata->>'level'
ORDER BY
  CASE metadata->>'level'
    WHEN 'super' THEN 1
    WHEN 'system' THEN 2
    WHEN 'tenant' THEN 3
    WHEN 'department' THEN 4
    WHEN 'user' THEN 5
    WHEN 'guest' THEN 6
    ELSE 7
  END;

-- 详细角色信息
SELECT
  name as "角色名",
  description as "描述",
  metadata->>'category' as "分类",
  metadata->>'level' as "等级",
  metadata->>'scope' as "数据范围",
  "isSystem" as "系统角色"
FROM roles
ORDER BY
  CASE metadata->>'level'
    WHEN 'super' THEN 1
    WHEN 'system' THEN 2
    WHEN 'tenant' THEN 3
    WHEN 'department' THEN 4
    WHEN 'user' THEN 5
    WHEN 'guest' THEN 6
    ELSE 7
  END,
  name;

-- 显示配额信息
SELECT
  name as "角色名",
  metadata->'quotas'->>'maxDevices' as "最大设备数",
  metadata->'quotas'->>'maxStorage' as "最大存储(MB)",
  metadata->'quotas'->>'maxCPU' as "最大CPU核心",
  metadata->'quotas'->>'maxMemory' as "最大内存(MB)"
FROM roles
WHERE metadata ? 'quotas'
ORDER BY (metadata->'quotas'->>'maxDevices')::int DESC;
