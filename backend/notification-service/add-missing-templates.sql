-- ======================================
-- 补充缺失的6个通知模板
-- 用途：达到100%模板覆盖率
-- ======================================

-- 1. 设备启动通知
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('device.started', '设备启动成功', 'device', '设备已启动', '您的设备 {{deviceName}} 已成功启动，现在可以使用了。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #52c41a;">✓ 设备启动成功</h2>
    <p>设备名称：<strong>{{deviceName}}</strong></p>
    <p>启动时间：{{formatDate startedAt}}</p>
    <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0;">
      <p>您的云手机已准备就绪，可以开始使用了。</p>
    </div>
  </div>',
  '【云手机】设备{{deviceName}}已启动，现在可以使用了！',
  ARRAY['websocket', 'push'],
  '{"deviceName": "我的云手机"}'::jsonb,
  '设备启动成功后的通知'
);

-- 2. 设备停止通知
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('device.stopped', '设备已停止', 'device', '设备已停止运行', '您的设备 {{deviceName}} 已停止运行。{{#if reason}}停止原因：{{reason}}{{/if}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #faad14;">⏸ 设备已停止</h2>
    <p>设备名称：<strong>{{deviceName}}</strong></p>
    <p>停止时间：{{formatDate stoppedAt}}</p>
    {{#if reason}}
    <div style="background: #fffbe6; border-left: 4px solid #faad14; padding: 15px; margin: 20px 0;">
      <p>停止原因：{{reason}}</p>
    </div>
    {{/if}}
  </div>',
  '【云手机】设备{{deviceName}}已停止运行。',
  ARRAY['websocket'],
  '{"deviceName": "我的云手机", "reason": "用户手动停止"}'::jsonb,
  '设备停止运行时的通知'
);

-- 3. 设备连接丢失通知
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('device.connection_lost', '设备连接断开', 'alert', '设备连接断开', '您的设备 {{deviceName}} 连接已断开，请检查网络连接。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #ff4d4f;">⚠️ 设备连接断开</h2>
    <p>设备名称：<strong>{{deviceName}}</strong></p>
    <p>最后在线：{{formatDate lastSeenAt}}</p>
    <p>断开时间：{{formatDate lostAt}}</p>
    <div style="background: #fff2e8; border-left: 4px solid #ff7a45; padding: 15px; margin: 20px 0;">
      <p><strong>建议操作：</strong></p>
      <ul style="margin: 10px 0;">
        <li>检查网络连接</li>
        <li>重启设备</li>
        <li>联系技术支持</li>
      </ul>
    </div>
  </div>',
  '【云手机】警告：设备{{deviceName}}连接断开，请检查网络。',
  ARRAY['websocket', 'email', 'push'],
  '{"deviceName": "我的云手机"}'::jsonb,
  '设备连接丢失时的告警通知'
);

-- 4. 设备删除通知
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('device.deleted', '设备已删除', 'device', '设备已删除', '您的设备 {{deviceName}} 已被成功删除。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #8c8c8c;">🗑 设备已删除</h2>
    <p>设备名称：<strong>{{deviceName}}</strong></p>
    <p>设备ID：{{deviceId}}</p>
    <p>删除时间：{{formatDate deletedAt}}</p>
    <div style="background: #f5f5f5; border-left: 4px solid #8c8c8c; padding: 15px; margin: 20px 0;">
      <p>设备数据已永久删除，如需恢复请联系客服。</p>
    </div>
  </div>',
  '【云手机】设备{{deviceName}}已删除。',
  ARRAY['websocket', 'email'],
  '{"deviceName": "我的云手机", "deviceId": "device-12345"}'::jsonb,
  '设备删除后的确认通知'
);

-- 5. 应用更新通知
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('app.updated', '应用已更新', 'system', '应用更新成功', '应用 {{appName}} 已成功更新至 {{newVersion}}。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1890ff;">🔄 应用更新成功</h2>
    <p>应用名称：<strong>{{appName}}</strong></p>
    <p>新版本：<strong>{{newVersion}}</strong></p>
    {{#if oldVersion}}
    <p>旧版本：{{oldVersion}}</p>
    {{/if}}
    <div style="background: #e6f7ff; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0;">
      <p><strong>更新内容：</strong></p>
      <ul>
        <li>性能优化</li>
        <li>Bug修复</li>
        <li>新功能添加</li>
      </ul>
    </div>
  </div>',
  '【云手机】应用{{appName}}已更新至{{newVersion}}。',
  ARRAY['websocket'],
  '{"appName": "微信", "newVersion": "8.0.32", "oldVersion": "8.0.31"}'::jsonb,
  '应用更新成功后的通知'
);

-- 6. 用户资料更新通知
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('user.profile_updated', '个人资料已更新', 'system', '个人资料已更新', '您已成功更新个人资料{{#if updatedFields}}：{{#each updatedFields}}{{this}}{{#unless @last}}、{{/unless}}{{/each}}{{/if}}。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #52c41a;">✓ 个人资料已更新</h2>
    {{#if updatedFields}}
    <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0;">
      <p><strong>更新的字段：</strong></p>
      <ul>
        {{#each updatedFields}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
    </div>
    {{/if}}
    <p>更新时间：{{formatDate updatedAt}}</p>
  </div>',
  '【云手机】您的个人资料已更新。',
  ARRAY['websocket'],
  '{"updatedFields": ["昵称", "头像", "手机号"]}'::jsonb,
  '用户资料更新后的确认通知'
);

-- 统计当前模板数量
SELECT
  COUNT(*) as total_templates,
  COUNT(CASE WHEN type = 'system' THEN 1 END) as system_templates,
  COUNT(CASE WHEN type = 'device' THEN 1 END) as device_templates,
  COUNT(CASE WHEN type = 'alert' THEN 1 END) as alert_templates,
  COUNT(CASE WHEN type = 'billing' THEN 1 END) as billing_templates
FROM notification_templates;

-- 列出所有模板
SELECT code, name, type, is_active
FROM notification_templates
ORDER BY type, code;

-- 完成
\echo '✅ 成功添加 6 个缺失模板！现在共有 21 个模板'
