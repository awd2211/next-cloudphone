-- ============================================
-- 套餐模板测试数据
-- 包含免费、基础、专业、企业版套餐
-- ============================================

-- 清空现有套餐数据 (可选)
-- TRUNCATE TABLE plans CASCADE;

-- 1. 免费版套餐 (Free Tier)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '免费版',
  '适合个人用户试用，体验云手机基础功能',
  'free',
  0.00,
  'monthly',
  1,
  5,
  10,
  '["基础设备管理", "标准性能配置", "社区支持", "基础应用市场", "7天数据保留"]'::jsonb,
  '{"cpuCores": 1, "memoryGB": 2, "maxConcurrent": 1, "supportLevel": "community", "sla": "无保障", "priority": 0}'::jsonb,
  true,
  true
);

-- 2. 基础版套餐 (按小时计费)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '基础版-按小时',
  '灵活的按需使用方案，适合临时或短期使用',
  'basic',
  0.50,
  'hourly',
  3,
  10,
  50,
  '["设备管理", "标准性能", "应用市场", "30天数据保留", "邮件支持", "基础监控"]'::jsonb,
  '{"cpuCores": 2, "memoryGB": 4, "maxConcurrent": 3, "supportLevel": "email", "sla": "95%", "priority": 1}'::jsonb,
  true,
  true
);

-- 3. 基础版套餐 (按月计费)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '基础版-包月',
  '经济实惠的月付方案，适合个人开发者和小团队',
  'basic',
  99.00,
  'monthly',
  5,
  20,
  100,
  '["设备管理", "标准性能", "应用市场", "30天数据保留", "邮件支持", "基础监控", "API访问"]'::jsonb,
  '{"cpuCores": 2, "memoryGB": 4, "maxConcurrent": 5, "supportLevel": "email", "sla": "95%", "priority": 1, "discount": "相比按小时节省30%"}'::jsonb,
  true,
  true
);

-- 4. 专业版套餐 (按天计费)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '专业版-按天',
  '适合中短期项目的专业级方案',
  'pro',
  8.00,
  'daily',
  10,
  50,
  200,
  '["高级设备管理", "高性能配置", "完整应用市场", "90天数据保留", "工单支持", "高级监控", "批量操作", "快照备份"]'::jsonb,
  '{"cpuCores": 4, "memoryGB": 8, "maxConcurrent": 10, "supportLevel": "ticket", "sla": "99%", "priority": 2, "advancedFeatures": ["自动扩缩容", "故障转移"]}'::jsonb,
  true,
  true
);

-- 5. 专业版套餐 (按月计费)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '专业版-包月',
  '适合中小企业和专业团队的全功能方案',
  'pro',
  499.00,
  'monthly',
  20,
  100,
  500,
  '["高级设备管理", "高性能配置", "完整应用市场", "90天数据保留", "工单支持", "高级监控", "批量操作", "快照备份", "自动化运维"]'::jsonb,
  '{"cpuCores": 4, "memoryGB": 8, "maxConcurrent": 20, "supportLevel": "ticket", "sla": "99%", "priority": 2, "advancedFeatures": ["自动扩缩容", "故障转移", "负载均衡"], "discount": "相比按天节省25%"}'::jsonb,
  true,
  true
);

-- 6. 专业版套餐 (按年计费)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '专业版-包年',
  '长期使用优惠，性价比最高的专业版方案',
  'pro',
  4990.00,
  'yearly',
  20,
  100,
  500,
  '["高级设备管理", "高性能配置", "完整应用市场", "365天数据保留", "工单支持", "高级监控", "批量操作", "快照备份", "自动化运维", "优先支持"]'::jsonb,
  '{"cpuCores": 4, "memoryGB": 8, "maxConcurrent": 20, "supportLevel": "priority", "sla": "99%", "priority": 2, "advancedFeatures": ["自动扩缩容", "故障转移", "负载均衡", "智能调度"], "discount": "相比按月节省17%"}'::jsonb,
  true,
  true
);

-- 7. 企业版套餐 (按月计费)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '企业版-包月',
  '为大型企业量身定制的企业级解决方案',
  'enterprise',
  1999.00,
  'monthly',
  100,
  500,
  2000,
  '["企业级设备管理", "旗舰性能", "企业应用市场", "无限数据保留", "专属客服", "企业级监控", "高级批量操作", "自动备份", "多租户管理", "SSO集成", "审计日志"]'::jsonb,
  '{"cpuCores": 8, "memoryGB": 16, "maxConcurrent": 100, "supportLevel": "dedicated", "sla": "99.9%", "priority": 3, "advancedFeatures": ["自动扩缩容", "智能故障转移", "多区域负载均衡", "智能调度", "GPU支持", "物理设备接入"], "customization": true}'::jsonb,
  true,
  true
);

-- 8. 企业版套餐 (按年计费)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '企业版-包年',
  '企业长期合作方案，享受最高优先级和最佳价格',
  'enterprise',
  19990.00,
  'yearly',
  150,
  1000,
  5000,
  '["企业级设备管理", "旗舰性能", "企业应用市场", "无限数据保留", "专属客服", "企业级监控", "高级批量操作", "自动备份", "多租户管理", "SSO集成", "审计日志", "定制开发", "驻场服务"]'::jsonb,
  '{"cpuCores": 8, "memoryGB": 16, "maxConcurrent": 150, "supportLevel": "dedicated", "sla": "99.95%", "priority": 3, "advancedFeatures": ["自动扩缩容", "智能故障转移", "多区域负载均衡", "智能调度", "GPU支持", "物理设备接入", "混合云部署", "私有化部署"], "customization": true, "onsite": true, "discount": "相比按月节省17%"}'::jsonb,
  true,
  true
);

-- 9. 企业定制版 (按需报价)
INSERT INTO plans (
  name,
  description,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  features,
  metadata,
  "isActive",
  "isPublic"
) VALUES (
  '企业定制版',
  '完全定制化的企业解决方案，根据实际需求定价',
  'enterprise',
  0.00,
  'monthly',
  9999,
  9999,
  9999,
  '["所有企业版功能", "无限设备", "无限存储", "无限流量", "定制功能开发", "专属技术团队", "7x24小时支持", "私有化部署", "源码授权（可选）"]'::jsonb,
  '{"cpuCores": 999, "memoryGB": 999, "maxConcurrent": 9999, "supportLevel": "dedicated", "sla": "99.99%", "priority": 4, "contact": "请联系销售团队获取报价", "customization": true, "fullSupport": true}'::jsonb,
  true,
  false
);

-- ============================================
-- 验证查询
-- ============================================

-- 查看所有套餐
SELECT
  name,
  type,
  price,
  "billingCycle",
  "deviceQuota",
  "storageQuotaGB",
  "trafficQuotaGB",
  "isActive",
  "isPublic"
FROM plans
ORDER BY
  CASE type
    WHEN 'free' THEN 1
    WHEN 'basic' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'enterprise' THEN 4
  END,
  CASE "billingCycle"
    WHEN 'hourly' THEN 1
    WHEN 'daily' THEN 2
    WHEN 'monthly' THEN 3
    WHEN 'yearly' THEN 4
  END;

-- 统计套餐数量
SELECT
  type as plan_type,
  COUNT(*) as count,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM plans
WHERE "isActive" = true
GROUP BY type
ORDER BY
  CASE type
    WHEN 'free' THEN 1
    WHEN 'basic' THEN 2
    WHEN 'pro' THEN 3
    WHEN 'enterprise' THEN 4
  END;
