-- =====================================================
-- 迁移: 添加新的云手机提供商类型
-- 日期: 2025-11-25
-- 描述: 为 device_provider_type enum 添加 5 个新的提供商类型
-- =====================================================

-- 注意: PostgreSQL 的 ALTER TYPE ... ADD VALUE 不能在事务中执行
-- 需要单独运行每个 ADD VALUE 语句

-- 检查并添加新的 enum 值
DO $$
BEGIN
    -- 腾讯云云游戏
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'device_provider_type'::regtype
        AND enumlabel = 'tencent_gs'
    ) THEN
        ALTER TYPE device_provider_type ADD VALUE 'tencent_gs';
        RAISE NOTICE 'Added tencent_gs to device_provider_type';
    END IF;
END $$;

DO $$
BEGIN
    -- 百度云手机
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'device_provider_type'::regtype
        AND enumlabel = 'baidu_bac'
    ) THEN
        ALTER TYPE device_provider_type ADD VALUE 'baidu_bac';
        RAISE NOTICE 'Added baidu_bac to device_provider_type';
    END IF;
END $$;

DO $$
BEGIN
    -- AWS Device Farm
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'device_provider_type'::regtype
        AND enumlabel = 'aws_device_farm'
    ) THEN
        ALTER TYPE device_provider_type ADD VALUE 'aws_device_farm';
        RAISE NOTICE 'Added aws_device_farm to device_provider_type';
    END IF;
END $$;

DO $$
BEGIN
    -- Genymotion Cloud
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'device_provider_type'::regtype
        AND enumlabel = 'genymotion'
    ) THEN
        ALTER TYPE device_provider_type ADD VALUE 'genymotion';
        RAISE NOTICE 'Added genymotion to device_provider_type';
    END IF;
END $$;

DO $$
BEGIN
    -- BrowserStack
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumtypid = 'device_provider_type'::regtype
        AND enumlabel = 'browserstack'
    ) THEN
        ALTER TYPE device_provider_type ADD VALUE 'browserstack';
        RAISE NOTICE 'Added browserstack to device_provider_type';
    END IF;
END $$;

-- 验证添加成功
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'device_provider_type'::regtype
ORDER BY enumsortorder;

-- =====================================================
-- 可选: 为新提供商添加默认配置
-- =====================================================

-- 添加默认的提供商配置 (如果 provider_configs 表存在)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'provider_configs') THEN
        -- Genymotion Cloud (生产就绪)
        INSERT INTO provider_configs (
            id, provider_type, name, enabled, priority, config, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            'genymotion',
            'Genymotion Cloud',
            false,
            5,
            '{"description": "Genymotion Cloud Android 模拟器", "apiBaseUrl": "https://cloud.geny.io/api/v1/", "requiresCredentials": true}'::jsonb,
            NOW(),
            NOW()
        ) ON CONFLICT (provider_type) DO NOTHING;

        -- BrowserStack (生产就绪)
        INSERT INTO provider_configs (
            id, provider_type, name, enabled, priority, config, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            'browserstack',
            'BrowserStack App Live',
            false,
            6,
            '{"description": "BrowserStack 真机测试平台", "apiBaseUrl": "https://api.browserstack.com/app-live/", "requiresCredentials": true}'::jsonb,
            NOW(),
            NOW()
        ) ON CONFLICT (provider_type) DO NOTHING;

        -- AWS Device Farm (建议使用 SDK)
        INSERT INTO provider_configs (
            id, provider_type, name, enabled, priority, config, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            'aws_device_farm',
            'AWS Device Farm',
            false,
            7,
            '{"description": "AWS 真机测试服务", "region": "us-west-2", "requiresCredentials": true, "note": "建议使用 @aws-sdk/client-device-farm"}'::jsonb,
            NOW(),
            NOW()
        ) ON CONFLICT (provider_type) DO NOTHING;

        -- 腾讯云云游戏 (需验证)
        INSERT INTO provider_configs (
            id, provider_type, name, enabled, priority, config, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            'tencent_gs',
            '腾讯云云游戏',
            false,
            8,
            '{"description": "腾讯云云游戏服务", "region": "ap-guangzhou", "requiresCredentials": true, "status": "needs_verification"}'::jsonb,
            NOW(),
            NOW()
        ) ON CONFLICT (provider_type) DO NOTHING;

        -- 百度云手机 (需验证)
        INSERT INTO provider_configs (
            id, provider_type, name, enabled, priority, config, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            'baidu_bac',
            '百度云手机',
            false,
            9,
            '{"description": "百度云手机服务", "region": "bj", "requiresCredentials": true, "status": "needs_verification"}'::jsonb,
            NOW(),
            NOW()
        ) ON CONFLICT (provider_type) DO NOTHING;

        RAISE NOTICE 'Added default provider configurations';
    ELSE
        RAISE NOTICE 'provider_configs table does not exist, skipping default configs';
    END IF;
END $$;

-- 完成
SELECT 'Migration completed: Added 5 new provider types to device_provider_type enum' AS status;
