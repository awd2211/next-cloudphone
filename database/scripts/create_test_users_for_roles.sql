-- ================================================================================
-- 为新角色创建测试用户
-- 用于验证角色权限配置是否正常工作
-- ================================================================================
--
-- 使用说明：
-- 1. 执行此脚本创建测试用户
-- 2. 使用这些用户登录系统测试权限
-- 3. 测试完成后可以删除这些用户
--
-- 默认密码（所有测试用户）: Test@123456
-- 密码哈希使用 bcrypt (cost=10)
-- ================================================================================

BEGIN;

-- ================================================================================
-- 1. 为 live_chat_agent 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-1111-1111-1111-111111111111',
    'test_live_chat_agent',
    'test.livechat.agent@cloudphone.test',
    '$2b$10$YourBcryptHashHere',  -- 需要使用实际的bcrypt哈希
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

-- 分配角色
INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-1111-1111-1111-111111111111', 'b1a2c3d4-e5f6-4789-abcd-111111111111')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 2. 为 live_chat_supervisor 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-2222-2222-2222-222222222222',
    'test_live_chat_supervisor',
    'test.livechat.supervisor@cloudphone.test',
    '$2b$10$YourBcryptHashHere',
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-2222-2222-2222-222222222222', 'b1a2c3d4-e5f6-4789-abcd-222222222222')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 3. 为 proxy_manager 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-3333-3333-3333-333333333333',
    'test_proxy_manager',
    'test.proxy.manager@cloudphone.test',
    '$2b$10$YourBcryptHashHere',
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-3333-3333-3333-333333333333', 'b1a2c3d4-e5f6-4789-abcd-333333333333')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 4. 为 device_operator 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-4444-4444-4444-444444444444',
    'test_device_operator',
    'test.device.operator@cloudphone.test',
    '$2b$10$YourBcryptHashHere',
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-4444-4444-4444-444444444444', 'b1a2c3d4-e5f6-4789-abcd-444444444444')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 5. 为 scheduler_admin 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-5555-5555-5555-555555555555',
    'test_scheduler_admin',
    'test.scheduler.admin@cloudphone.test',
    '$2b$10$YourBcryptHashHere',
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-5555-5555-5555-555555555555', 'b1a2c3d4-e5f6-4789-abcd-555555555555')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 6. 为 content_editor 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-6666-6666-6666-666666666666',
    'test_content_editor',
    'test.content.editor@cloudphone.test',
    '$2b$10$YourBcryptHashHere',
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-6666-6666-6666-666666666666', 'b1a2c3d4-e5f6-4789-abcd-666666666666')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 7. 为 app_manager 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-7777-7777-7777-777777777777',
    'test_app_manager',
    'test.app.manager@cloudphone.test',
    '$2b$10$YourBcryptHashHere',
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-7777-7777-7777-777777777777', 'b1a2c3d4-e5f6-4789-abcd-777777777777')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 8. 为 partner 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-8888-8888-8888-888888888888',
    'test_partner',
    'test.partner@cloudphone.test',
    '$2b$10$YourBcryptHashHere',
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-8888-8888-8888-888888888888', 'b1a2c3d4-e5f6-4789-abcd-888888888888')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 9. 为 api_user 创建测试用户
-- ================================================================================

INSERT INTO users (id, username, email, password, status, "tenantId")
VALUES
  (
    'test-9999-9999-9999-999999999999',
    'test_api_user',
    'test.api.user@cloudphone.test',
    '$2b$10$YourBcryptHashHere',
    'active',
    'default'
  )
ON CONFLICT (username) DO UPDATE SET
  email = EXCLUDED.email,
  status = EXCLUDED.status;

INSERT INTO user_roles (user_id, role_id)
VALUES
  ('test-9999-9999-9999-999999999999', 'b1a2c3d4-e5f6-4789-abcd-999999999999')
ON CONFLICT DO NOTHING;

-- ================================================================================
-- 验证创建的测试用户
-- ================================================================================

SELECT
  u.username as "用户名",
  u.email as "邮箱",
  r.name as "角色",
  u.status as "状态"
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username LIKE 'test_%'
ORDER BY u.username;

COMMIT;

-- ================================================================================
-- 清理测试用户的脚本（谨慎使用）
-- ================================================================================
--
-- 如果需要删除所有测试用户，取消下面的注释并执行
--
-- BEGIN;
--
-- -- 删除用户角色关联
-- DELETE FROM user_roles
-- WHERE user_id IN (
--   SELECT id FROM users WHERE username LIKE 'test_%'
-- );
--
-- -- 删除测试用户
-- DELETE FROM users WHERE username LIKE 'test_%';
--
-- COMMIT;
-- ================================================================================

-- ================================================================================
-- 生成 bcrypt 密码哈希的 Node.js 脚本
-- ================================================================================
--
-- 将以下代码保存为 generate-hash.js 并运行：
--
-- const bcrypt = require('bcrypt');
-- const password = 'Test@123456';
-- bcrypt.hash(password, 10, (err, hash) => {
--   if (err) throw err;
--   console.log('Password hash:', hash);
-- });
--
-- 然后将生成的哈希替换上面的 '$2b$10$YourBcryptHashHere'
-- ================================================================================
