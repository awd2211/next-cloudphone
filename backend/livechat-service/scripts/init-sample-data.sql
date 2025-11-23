-- LiveChat Service 示例数据初始化脚本
-- 用于开发和测试环境

-- ========================================
-- 1. 创建示例客服分组
-- ========================================
INSERT INTO agent_groups (id, tenant_id, name, description, skills, working_hours, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'default', '技术支持组', '处理技术问题和设备故障', ARRAY['technical', 'device', 'troubleshooting'], '{"start": "09:00", "end": "18:00", "timezone": "Asia/Shanghai"}', true),
  ('22222222-2222-2222-2222-222222222222', 'default', '销售咨询组', '处理产品咨询和购买问题', ARRAY['sales', 'pricing', 'product'], '{"start": "09:00", "end": "21:00", "timezone": "Asia/Shanghai"}', true),
  ('33333333-3333-3333-3333-333333333333', 'default', 'VIP 客户组', '专属 VIP 客户服务', ARRAY['vip', 'priority', 'all'], '{"start": "00:00", "end": "23:59", "timezone": "Asia/Shanghai"}', true)
ON CONFLICT DO NOTHING;

-- ========================================
-- 2. 创建示例客服
-- ========================================
INSERT INTO agents (id, user_id, tenant_id, name, email, status, max_concurrent_chats, skills, priority, is_active)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adff5704-873b-4014-8413-d42ff84f9f79', 'default', '张小明', 'zhangxm@cloudphone.com', 'online', 5, ARRAY['technical', 'device'], 10, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'default', '李小红', 'lixh@cloudphone.com', 'online', 5, ARRAY['sales', 'pricing'], 5, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'default', '王大伟', 'wangdw@cloudphone.com', 'away', 8, ARRAY['vip', 'technical', 'sales'], 20, true)
ON CONFLICT DO NOTHING;

-- ========================================
-- 3. 关联客服与分组
-- ========================================
INSERT INTO agent_group_members (agent_id, group_id)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- ========================================
-- 4. 创建排队配置
-- ========================================
INSERT INTO queue_configs (id, tenant_id, name, description, routing_strategy, max_wait_time, priority, skills, is_active)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'default', '默认队列', '通用咨询队列', 'ROUND_ROBIN', 300, 0, ARRAY[]::text[], true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'default', '技术支持队列', '技术问题专用队列', 'SKILL_BASED', 600, 5, ARRAY['technical'], true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'default', 'VIP 快速通道', 'VIP 客户优先队列', 'PRIORITY', 60, 100, ARRAY['vip'], true)
ON CONFLICT DO NOTHING;

-- ========================================
-- 5. 创建快捷回复模板
-- ========================================
INSERT INTO canned_responses (id, tenant_id, title, content, shortcut, category, tags, is_global, is_active)
VALUES
  (gen_random_uuid(), 'default', '欢迎语', '您好！欢迎使用云手机平台，我是客服小明，很高兴为您服务。请问有什么可以帮助您的？', '/hi', '通用', ARRAY['greeting', 'welcome'], true, true),
  (gen_random_uuid(), 'default', '结束语', '感谢您的咨询！如有其他问题，欢迎随时联系我们。祝您使用愉快！', '/bye', '通用', ARRAY['farewell', 'closing'], true, true),
  (gen_random_uuid(), 'default', '转人工', '好的，我现在为您转接人工客服，请稍等...', '/transfer', '通用', ARRAY['transfer', 'human'], true, true),
  (gen_random_uuid(), 'default', '设备重启指引', '请尝试以下步骤重启您的云手机：\n1. 进入设备管理页面\n2. 选择您的设备\n3. 点击"重启"按钮\n4. 等待约30秒设备重新启动', '/restart', '技术支持', ARRAY['device', 'restart', 'technical'], true, true),
  (gen_random_uuid(), 'default', '网络问题排查', '网络连接问题排查步骤：\n1. 检查您的本地网络是否正常\n2. 尝试刷新页面\n3. 清除浏览器缓存\n4. 如问题持续，请提供设备ID以便我们进一步排查', '/network', '技术支持', ARRAY['network', 'troubleshooting'], true, true),
  (gen_random_uuid(), 'default', '价格咨询', '我们提供多种套餐方案：\n- 基础版：¥99/月，1台设备\n- 专业版：¥299/月，5台设备\n- 企业版：¥999/月，20台设备\n详情请访问我们的定价页面或联系销售团队。', '/price', '销售', ARRAY['pricing', 'plans'], true, true)
ON CONFLICT DO NOTHING;

-- ========================================
-- 6. 创建敏感词列表
-- ========================================
INSERT INTO sensitive_words (id, tenant_id, word, level, category, action, is_active)
VALUES
  (gen_random_uuid(), 'default', '竞品名称', 'warning', '竞品', 'flag', true),
  (gen_random_uuid(), 'default', '骂人', 'high', '不文明用语', 'block', true),
  (gen_random_uuid(), 'default', '退款', 'low', '敏感话题', 'flag', true),
  (gen_random_uuid(), 'default', '投诉', 'medium', '敏感话题', 'flag', true),
  (gen_random_uuid(), 'default', '法院', 'high', '法律相关', 'alert', true)
ON CONFLICT DO NOTHING;

-- ========================================
-- 完成提示
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LiveChat 示例数据初始化完成!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '创建内容:';
  RAISE NOTICE '  - 3 个客服分组';
  RAISE NOTICE '  - 3 个示例客服';
  RAISE NOTICE '  - 3 个排队配置';
  RAISE NOTICE '  - 6 个快捷回复模板';
  RAISE NOTICE '  - 5 个敏感词';
  RAISE NOTICE '========================================';
END $$;
