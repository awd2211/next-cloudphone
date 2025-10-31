-- 创建测试用户 - 密码都是 admin123
DO $$
DECLARE
    password_hash TEXT := '$2b$10$nIYPrhROHf0e6AdsWiAqTuCTqk1fV5.j.4dlDkrc2Kv5PyIbt7N5y';
    test_user_id UUID;
    role_uuid UUID;
BEGIN
    -- 1. 超级管理员
    SELECT id INTO role_uuid FROM roles WHERE name = 'admin';
    INSERT INTO users (username, email, password, status) VALUES ('admin', 'admin@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建超级管理员: admin / admin123';

    -- 2. 普通用户
    SELECT id INTO role_uuid FROM roles WHERE name = 'user';
    INSERT INTO users (username, email, password, status) VALUES ('user01', 'user01@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建普通用户: user01 / admin123';

    -- 3. 租户管理员
    SELECT id INTO role_uuid FROM roles WHERE name = 'tenant_admin';
    INSERT INTO users (username, email, password, status) VALUES ('tenant_admin', 'tenant_admin@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建租户管理员: tenant_admin / admin123';

    -- 4. 部门管理员
    SELECT id INTO role_uuid FROM roles WHERE name = 'department_admin';
    INSERT INTO users (username, email, password, status) VALUES ('dept_admin', 'dept_admin@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建部门管理员: dept_admin / admin123';

    -- 5. 运维工程师
    SELECT id INTO role_uuid FROM roles WHERE name = 'devops';
    INSERT INTO users (username, email, password, status) VALUES ('devops', 'devops@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建运维工程师: devops / admin123';

    -- 6. 客服专员
    SELECT id INTO role_uuid FROM roles WHERE name = 'customer_service';
    INSERT INTO users (username, email, password, status) VALUES ('cs_staff', 'cs@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建客服专员: cs_staff / admin123';

    -- 7. 审核专员
    SELECT id INTO role_uuid FROM roles WHERE name = 'auditor';
    INSERT INTO users (username, email, password, status) VALUES ('auditor', 'auditor@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建审核专员: auditor / admin123';

    -- 8. 财务专员
    SELECT id INTO role_uuid FROM roles WHERE name = 'finance';
    INSERT INTO users (username, email, password, status) VALUES ('finance', 'finance@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建财务专员: finance / admin123';

    -- 9. 会计
    SELECT id INTO role_uuid FROM roles WHERE name = 'accountant';
    INSERT INTO users (username, email, password, status) VALUES ('accountant', 'accountant@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建会计: accountant / admin123';

    -- 10. VIP用户
    SELECT id INTO role_uuid FROM roles WHERE name = 'vip_user';
    INSERT INTO users (username, email, password, status) VALUES ('vip_user', 'vip@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建VIP用户: vip_user / admin123';

    -- 11. 企业用户
    SELECT id INTO role_uuid FROM roles WHERE name = 'enterprise_user';
    INSERT INTO users (username, email, password, status) VALUES ('enterprise', 'enterprise@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建企业用户: enterprise / admin123';

    -- 12. 开发者
    SELECT id INTO role_uuid FROM roles WHERE name = 'developer';
    INSERT INTO users (username, email, password, status) VALUES ('developer', 'developer@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建开发者: developer / admin123';

    -- 13. 测试用户
    SELECT id INTO role_uuid FROM roles WHERE name = 'test_user';
    INSERT INTO users (username, email, password, status) VALUES ('tester', 'tester@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建测试用户: tester / admin123';

    -- 14. 只读用户
    SELECT id INTO role_uuid FROM roles WHERE name = 'readonly_user';
    INSERT INTO users (username, email, password, status) VALUES ('readonly', 'readonly@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建只读用户: readonly / admin123';

    -- 15. 访客
    SELECT id INTO role_uuid FROM roles WHERE name = 'guest';
    INSERT INTO users (username, email, password, status) VALUES ('guest', 'guest@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建访客: guest / admin123';

    -- 16. 数据分析师
    SELECT id INTO role_uuid FROM roles WHERE name = 'data_analyst';
    INSERT INTO users (username, email, password, status) VALUES ('analyst', 'analyst@test.com', password_hash, 'active')
    ON CONFLICT (username) DO UPDATE SET password = password_hash RETURNING id INTO test_user_id;
    DELETE FROM user_roles WHERE user_id = test_user_id;
    INSERT INTO user_roles (user_id, role_id) VALUES (test_user_id, role_uuid);
    RAISE NOTICE '✅ 创建数据分析师: analyst / admin123';

END $$;
