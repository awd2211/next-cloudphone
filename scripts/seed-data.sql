-- CloudPhone 测试种子数据
-- 用于快速填充测试数据到数据库

-- 开始事务
BEGIN;

-- ============================================
-- 1. 用户服务数据
-- ============================================

-- 创建权限
INSERT INTO permissions (id, name, resource, action, description, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'users.create', 'users', 'create', '创建用户', NOW(), NOW()),
  (gen_random_uuid(), 'users.read', 'users', 'read', '查看用户', NOW(), NOW()),
  (gen_random_uuid(), 'users.update', 'users', 'update', '更新用户', NOW(), NOW()),
  (gen_random_uuid(), 'users.delete', 'users', 'delete', '删除用户', NOW(), NOW()),
  (gen_random_uuid(), 'devices.create', 'devices', 'create', '创建设备', NOW(), NOW()),
  (gen_random_uuid(), 'devices.read', 'devices', 'read', '查看设备', NOW(), NOW()),
  (gen_random_uuid(), 'devices.update', 'devices', 'update', '更新设备', NOW(), NOW()),
  (gen_random_uuid(), 'devices.delete', 'devices', 'delete', '删除设备', NOW(), NOW()),
  (gen_random_uuid(), 'devices.control', 'devices', 'control', '控制设备', NOW(), NOW()),
  (gen_random_uuid(), 'apps.create', 'apps', 'create', '创建应用', NOW(), NOW()),
  (gen_random_uuid(), 'apps.read', 'apps', 'read', '查看应用', NOW(), NOW()),
  (gen_random_uuid(), 'apps.update', 'apps', 'update', '更新应用', NOW(), NOW()),
  (gen_random_uuid(), 'apps.delete', 'apps', 'delete', '删除应用', NOW(), NOW()),
  (gen_random_uuid(), 'billing.create', 'billing', 'create', '创建订单', NOW(), NOW()),
  (gen_random_uuid(), 'billing.read', 'billing', 'read', '查看订单', NOW(), NOW()),
  (gen_random_uuid(), 'billing.update', 'billing', 'update', '更新订单', NOW(), NOW()),
  (gen_random_uuid(), 'billing.delete', 'billing', 'delete', '删除订单', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 创建角色
INSERT INTO roles (id, name, description, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'admin', '拥有所有权限的超级管理员', NOW(), NOW()),
  (gen_random_uuid(), 'user', '普通用户角色', NOW(), NOW()),
  (gen_random_uuid(), 'support', '客服支持角色', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 创建用户 (密码都是 bcrypt 加密后的结果)
-- admin123: $2b$10$wOU0atFSYKCDWcwlWI4A4efLjV.C4LyFI4ZBY.iaYRSKStICaNowu
-- user123: $2b$10$jF70SpaFHv.MveAbxauwT.9Mj2saIEP35L5ofqinw4Dh7ikYTSuv2

INSERT INTO users (id, username, email, password, "fullName", phone, status, "createdAt", "updatedAt")
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@cloudphone.run', '$2b$10$wOU0atFSYKCDWcwlWI4A4efLjV.C4LyFI4ZBY.iaYRSKStICaNowu', '系统管理员', '13800138000', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'testuser1', 'user1@test.com', '$2b$10$jF70SpaFHv.MveAbxauwT.9Mj2saIEP35L5ofqinw4Dh7ikYTSuv2', '测试用户1', '13800138001', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'testuser2', 'user2@test.com', '$2b$10$jF70SpaFHv.MveAbxauwT.9Mj2saIEP35L5ofqinw4Dh7ikYTSuv2', '测试用户2', '13800138002', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'testuser3', 'user3@test.com', '$2b$10$jF70SpaFHv.MveAbxauwT.9Mj2saIEP35L5ofqinw4Dh7ikYTSuv2', '测试用户3', '13800138003', 'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000005', 'support1', 'support@cloudphone.run', '$2b$10$jF70SpaFHv.MveAbxauwT.9Mj2saIEP35L5ofqinw4Dh7ikYTSuv2', '客服人员', '13800138009', 'active', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- 关联用户和角色
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE (u.username = 'admin' AND r.name = 'admin')
   OR (u.username LIKE 'testuser%' AND r.name = 'user')
   OR (u.username = 'support1' AND r.name = 'support')
ON CONFLICT DO NOTHING;

-- 创建用户配额
INSERT INTO quotas (id, "userId", "quotaType", "totalQuota", "usedQuota", "resetCycle", "expiresAt", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  id,
  'device',
  10,
  0,
  'monthly',
  NOW() + INTERVAL '1 year',
  true,
  NOW(),
  NOW()
FROM users
WHERE username LIKE 'testuser%'
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. 计费服务数据
-- ============================================

-- 创建套餐
INSERT INTO plans (id, name, description, type, price, "billingCycle", "deviceQuota", "storageQuotaGB", "trafficQuotaGB", features, "isActive", "isPublic", metadata, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '免费体验版', '适合新用户体验，包含基础功能', 'free', 0, 'monthly', 1, 10, 5, '["基础设备控制","单设备支持","社区支持"]'::jsonb, true, true, '{"trial":true,"maxDuration":30}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '基础版', '适合个人开发者和小型团队', 'basic', 99, 'monthly', 5, 50, 100, '["5台设备","ADB控制","应用管理","邮件支持"]'::jsonb, true, true, '{"popular":false}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '专业版', '适合中型团队和企业', 'pro', 299, 'monthly', 20, 200, 500, '["20台设备","GPU加速","批量操作","快照管理","优先支持"]'::jsonb, true, true, '{"popular":true,"recommended":true}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '企业版', '适合大型企业，提供定制化服务', 'enterprise', 999, 'monthly', 100, 1000, 2000, '["100台设备","GPU加速","专属节点","SLA保障","7x24支持","API访问"]'::jsonb, true, true, '{"popular":false,"enterprise":true}'::jsonb, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 为测试用户创建余额账户
INSERT INTO user_balances (id, "userId", "availableBalance", "frozenBalance", "totalRecharge", "totalConsumption", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  id,
  1000,
  0,
  1000,
  0,
  NOW(),
  NOW()
FROM users
WHERE username LIKE 'testuser%'
ON CONFLICT ("userId") DO NOTHING;

-- 创建计费规则
INSERT INTO billing_rules (id, name, "resourceType", "billingModel", "unitPrice", unit, description, "isActive", metadata, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '设备按小时计费', 'device', 'hourly', 0.5, 'hour', '设备运行时按小时计费', true, '{"minCharge":0.1}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '存储按GB计费', 'storage', 'volume', 0.01, 'GB', '存储空间按GB计费', true, '{"freeQuota":10}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '流量按GB计费', 'traffic', 'volume', 0.8, 'GB', '网络流量按GB计费', true, '{"freeQuota":5}'::jsonb, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. 设备服务数据
-- ============================================

-- 创建节点
INSERT INTO nodes (id, name, ip, hostname, region, zone, status, "cpuTotal", "cpuUsed", "memoryTotal", "memoryUsed", "diskTotal", "diskUsed", "gpuCount", "gpuModel", labels, capacity, "createdAt", "updatedAt")
VALUES
  ('10000000-0000-0000-0000-000000000001', 'node-beijing-01', '192.168.1.101', 'node-beijing-01', 'cn-beijing', 'cn-beijing-a', 'ready', 16, 4, 32768, 8192, 500, 100, 2, 'NVIDIA Tesla T4', '{"environment":"production","region":"beijing"}'::jsonb, '{"maxDevices":50,"currentDevices":12}'::jsonb, NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002', 'node-shanghai-01', '192.168.1.102', 'node-shanghai-01', 'cn-shanghai', 'cn-shanghai-a', 'ready', 32, 8, 65536, 16384, 1000, 200, 4, 'NVIDIA Tesla T4', '{"environment":"production","region":"shanghai"}'::jsonb, '{"maxDevices":100,"currentDevices":25}'::jsonb, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 创建设备模板
INSERT INTO device_templates (id, name, description, category, "androidVersion", "cpuCores", "memoryMB", "diskGB", resolution, dpi, "isPublic", "useCount", "preInstalledApps", metadata, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '标准手机模板', '适合日常使用的标准Android手机配置', 'general', '13', 2, 4096, 32, '1080x2340', 420, true, 0, '["com.android.chrome","com.google.android.gm"]'::jsonb, '{"gpu":"auto","network":"nat"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '游戏专用模板', '高性能游戏手机配置，支持GPU加速', 'gaming', '13', 4, 8192, 64, '1440x3040', 560, true, 0, '["com.android.chrome"]'::jsonb, '{"gpu":"enabled","network":"nat","performance":"high"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '测试专用模板', '轻量级测试环境，快速启动', 'testing', '11', 1, 2048, 16, '720x1280', 320, true, 0, '[]'::jsonb, '{"gpu":"disabled","network":"nat"}'::jsonb, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 为测试用户创建设备
INSERT INTO devices (id, name, description, type, status, "userId", "cpuCores", "memoryMB", "storageMB", resolution, dpi, "androidVersion", "adbHost", "adbPort", metadata, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '测试设备-1-手机', '用户1的测试Android手机', 'phone', 'running', '00000000-0000-0000-0000-000000000002', 2, 4096, 32768, '1080x2340', 420, '13', 'localhost', 5555, '{"region":"beijing"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '测试设备-1-平板', '用户1的测试Android平板', 'tablet', 'stopped', '00000000-0000-0000-0000-000000000002', 4, 8192, 65536, '1600x2560', 320, '13', 'localhost', 5600, '{"region":"shanghai"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '测试设备-2-手机', '用户2的测试Android手机', 'phone', 'stopped', '00000000-0000-0000-0000-000000000003', 2, 4096, 32768, '1080x2340', 420, '13', 'localhost', 5556, '{"region":"shanghai"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '测试设备-2-平板', '用户2的测试Android平板', 'tablet', 'stopped', '00000000-0000-0000-0000-000000000003', 4, 8192, 65536, '1600x2560', 320, '13', 'localhost', 5601, '{"region":"beijing"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '测试设备-3-手机', '用户3的测试Android手机', 'phone', 'stopped', '00000000-0000-0000-0000-000000000004', 2, 4096, 32768, '1080x2340', 420, '13', 'localhost', 5557, '{"region":"beijing"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '测试设备-3-平板', '用户3的测试Android平板', 'tablet', 'stopped', '00000000-0000-0000-0000-000000000004', 4, 8192, 65536, '1600x2560', 320, '13', 'localhost', 5602, '{"region":"shanghai"}'::jsonb, NOW(), NOW());

-- ============================================
-- 4. 应用服务数据
-- ============================================

-- 创建应用
INSERT INTO applications (id, name, "packageName", "versionName", "versionCode", category, description, icon, size, "minSdkVersion", "targetSdkVersion", permissions, "isPublic", "downloadCount", metadata, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Chrome浏览器', 'com.android.chrome', '119.0.6045.163', 604516300, '浏览器', 'Google Chrome 浏览器官方版本', 'https://lh3.googleusercontent.com/KwUBNPbMTk9jDXYS2AeX3illtVRTkrKVh5xR1Mg4WHd0CG2tV4mrh1z3kXi5z_warlk', 145678901, 24, 33, '["android.permission.INTERNET","android.permission.ACCESS_NETWORK_STATE"]'::jsonb, true, 0, '{"publisher":"Google LLC"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '微信', 'com.tencent.mm', '8.0.40', 2380, '社交', '微信，是一个生活方式', 'https://example.com/wechat.png', 234567890, 21, 31, '["android.permission.INTERNET","android.permission.CAMERA","android.permission.RECORD_AUDIO","android.permission.READ_CONTACTS"]'::jsonb, true, 0, '{"publisher":"Tencent"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '抖音', 'com.ss.android.ugc.aweme', '28.0.0', 280000, '娱乐', '记录美好生活', 'https://example.com/douyin.png', 189012345, 21, 33, '["android.permission.INTERNET","android.permission.CAMERA","android.permission.RECORD_AUDIO","android.permission.ACCESS_FINE_LOCATION"]'::jsonb, true, 0, '{"publisher":"ByteDance"}'::jsonb, NOW(), NOW()),
  (gen_random_uuid(), '淘宝', 'com.taobao.taobao', '10.25.10', 468, '购物', '淘宝 - 太好逛了吧', 'https://example.com/taobao.png', 167890123, 21, 31, '["android.permission.INTERNET","android.permission.CAMERA","android.permission.ACCESS_FINE_LOCATION"]'::jsonb, true, 0, '{"publisher":"Alibaba"}'::jsonb, NOW(), NOW())
ON CONFLICT ("packageName") DO NOTHING;

-- 提交事务
COMMIT;

-- 显示结果
SELECT '✅ 种子数据已成功添加!' as message;
SELECT '📝 测试账号:' as info;
SELECT '   - admin / admin123 (管理员)' as account
UNION ALL SELECT '   - testuser1 / user123 (普通用户)'
UNION ALL SELECT '   - testuser2 / user123 (普通用户)'
UNION ALL SELECT '   - testuser3 / user123 (普通用户)'
UNION ALL SELECT '   - support1 / user123 (客服)';
