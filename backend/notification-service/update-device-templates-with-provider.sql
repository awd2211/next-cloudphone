-- ======================================
-- 更新设备通知模板以支持 Provider 信息显示
-- 用途：在通知中展示设备提供商类型（Redroid、Physical、华为云、阿里云）
-- ======================================

-- 1. 更新 device.created 模板
UPDATE notification_templates
SET
  title = '{{providerDisplayName}} 创建成功',
  body = '您的 {{providerDisplayName}} {{deviceName}} 已创建成功！设备ID: {{deviceId}}，可以开始使用了。',
  email_template = '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #52c41a;">✓ {{providerDisplayName}} 创建成功</h2>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>设备信息：</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>设备名称：<strong>{{deviceName}}</strong></li>
        <li>设备类型：{{providerDisplayName}}</li>
        <li>设备ID：{{deviceId}}</li>
        <li>创建时间：{{formatDate createdAt}}</li>
      </ul>
    </div>
    <a href="{{deviceUrl}}" style="display: inline-block; background: #52c41a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">立即使用</a>
  </div>',
  sms_template = '【云手机】您的{{providerDisplayName}} {{deviceName}}已创建成功，现在可以使用了！',
  default_data = jsonb_set(
    default_data,
    '{providerType}',
    '"redroid"'
  ),
  default_data = jsonb_set(
    default_data,
    '{providerDisplayName}',
    '"Redroid 容器设备"'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE code = 'device.created';

-- 2. 更新 device.creation_failed 模板
UPDATE notification_templates
SET
  title = '{{providerDisplayName}} 创建失败',
  body = '抱歉，{{providerDisplayName}} {{deviceName}} 创建失败。原因：{{reason}}。请重试或联系客服。',
  email_template = '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #ff4d4f;">✗ {{providerDisplayName}} 创建失败</h2>
    <div style="background: #fff1f0; border-left: 4px solid #ff4d4f; padding: 15px; margin: 20px 0;">
      <p><strong>失败信息：</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>设备名称：{{deviceName}}</li>
        <li>设备类型：{{providerDisplayName}}</li>
        <li>失败原因：<strong style="color: #ff4d4f;">{{reason}}</strong></li>
        <li>失败时间：{{formatDate failedAt}}</li>
      </ul>
    </div>
    <p>如需帮助，请联系客服或查看<a href="{{supportUrl}}" style="color: #1890ff;">常见问题</a>。</p>
  </div>',
  sms_template = '【云手机】{{providerDisplayName}} {{deviceName}}创建失败：{{reason}}。请重试或联系客服。',
  default_data = jsonb_set(
    default_data,
    '{providerType}',
    '"redroid"'
  ),
  default_data = jsonb_set(
    default_data,
    '{providerDisplayName}',
    '"Redroid 容器设备"'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE code = 'device.creation_failed';

-- 3. 更新 device.error 模板
UPDATE notification_templates
SET
  title = '{{providerDisplayName}} 运行异常',
  body = '您的 {{providerDisplayName}} {{deviceName}} 出现异常：{{errorMessage}}。我们正在处理，请稍后查看。',
  email_template = '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #ff4d4f;">⚠️ {{providerDisplayName}} 运行异常</h2>
    <div style="background: #fff2e8; border-left: 4px solid #ff7a45; padding: 15px; margin: 20px 0;">
      <p><strong>异常详情：</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>设备名称：{{deviceName}}</li>
        <li>设备类型：{{providerDisplayName}}</li>
        <li>异常类型：{{errorType}}</li>
        <li>异常描述：<strong style="color: #ff4d4f;">{{errorMessage}}</strong></li>
        <li>发生时间：{{formatDate occurredAt}}</li>
      </ul>
    </div>
    <p>系统正在尝试自动修复，如问题持续请联系客服。</p>
  </div>',
  sms_template = '【云手机】您的{{providerDisplayName}} {{deviceName}}出现异常：{{errorMessage}}。',
  default_data = jsonb_set(
    default_data,
    '{providerType}',
    '"redroid"'
  ),
  default_data = jsonb_set(
    default_data,
    '{providerDisplayName}',
    '"Redroid 容器设备"'
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE code = 'device.error';

-- 4. 新增 device.started 模板（如果不存在）
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description)
VALUES (
  'device.started',
  '设备启动成功',
  'device',
  '{{providerDisplayName}} 已启动',
  '您的 {{providerDisplayName}} {{deviceName}} 已成功启动，可以开始使用了。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #52c41a;">✓ {{providerDisplayName}} 已启动</h2>
    <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0;">
      <p><strong>设备信息：</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>设备名称：{{deviceName}}</li>
        <li>设备类型：{{providerDisplayName}}</li>
        <li>启动时间：{{formatDate startedAt}}</li>
      </ul>
    </div>
  </div>',
  '【云手机】您的{{providerDisplayName}} {{deviceName}}已启动。',
  ARRAY['websocket', 'push'],
  '{"deviceName": "我的云手机", "deviceId": "device-12345", "providerType": "redroid", "providerDisplayName": "Redroid 容器设备", "startedAt": "2025-10-29T10:00:00Z"}'::jsonb,
  '设备启动成功通知'
)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  email_template = EXCLUDED.email_template,
  sms_template = EXCLUDED.sms_template,
  default_data = EXCLUDED.default_data,
  updated_at = CURRENT_TIMESTAMP;

-- 5. 新增 device.stopped 模板（如果不存在）
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description)
VALUES (
  'device.stopped',
  '设备已停止',
  'device',
  '{{providerDisplayName}} 已停止',
  '您的 {{providerDisplayName}} {{deviceName}} 已停止运行{{#if reason}}，原因：{{reason}}{{/if}}。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #faad14;">⏸ {{providerDisplayName}} 已停止</h2>
    <div style="background: #fffbe6; border-left: 4px solid #faad14; padding: 15px; margin: 20px 0;">
      <p><strong>设备信息：</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>设备名称：{{deviceName}}</li>
        <li>设备类型：{{providerDisplayName}}</li>
        <li>停止时间：{{formatDate stoppedAt}}</li>
        {{#if reason}}<li>停止原因：{{reason}}</li>{{/if}}
      </ul>
    </div>
  </div>',
  '【云手机】您的{{providerDisplayName}} {{deviceName}}已停止{{#if reason}}，原因：{{reason}}{{/if}}。',
  ARRAY['websocket', 'push'],
  '{"deviceName": "我的云手机", "deviceId": "device-12345", "providerType": "redroid", "providerDisplayName": "Redroid 容器设备", "stoppedAt": "2025-10-29T12:00:00Z", "reason": "用户手动停止"}'::jsonb,
  '设备停止运行通知'
)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  email_template = EXCLUDED.email_template,
  sms_template = EXCLUDED.sms_template,
  default_data = EXCLUDED.default_data,
  updated_at = CURRENT_TIMESTAMP;

-- 6. 新增 device.connection_lost 模板（如果不存在）
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description)
VALUES (
  'device.connection_lost',
  '设备连接丢失',
  'alert',
  '{{providerDisplayName}} 连接丢失',
  '您的 {{providerDisplayName}} {{deviceName}} 连接已丢失，最后在线时间：{{formatDate lastSeenAt}}。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #ff4d4f;">⚠️ {{providerDisplayName}} 连接丢失</h2>
    <div style="background: #fff1f0; border-left: 4px solid #ff4d4f; padding: 15px; margin: 20px 0;">
      <p><strong>设备信息：</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>设备名称：{{deviceName}}</li>
        <li>设备类型：{{providerDisplayName}}</li>
        <li>最后在线：{{formatDate lastSeenAt}}</li>
        <li>检测时间：{{formatDate lostAt}}</li>
      </ul>
    </div>
    <p>系统正在尝试重新连接，如问题持续请检查网络或联系客服。</p>
  </div>',
  '【云手机】您的{{providerDisplayName}} {{deviceName}}连接丢失，最后在线：{{formatDate lastSeenAt}}。',
  ARRAY['email', 'websocket', 'push', 'sms'],
  '{"deviceName": "我的云手机", "deviceId": "device-12345", "providerType": "redroid", "providerDisplayName": "Redroid 容器设备", "lastSeenAt": "2025-10-29T11:30:00Z", "lostAt": "2025-10-29T11:35:00Z"}'::jsonb,
  '设备连接丢失告警'
)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  email_template = EXCLUDED.email_template,
  sms_template = EXCLUDED.sms_template,
  default_data = EXCLUDED.default_data,
  updated_at = CURRENT_TIMESTAMP;

-- 7. 新增 device.deleted 模板（如果不存在）
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description)
VALUES (
  'device.deleted',
  '设备已删除',
  'system',
  '{{providerDisplayName}} 已删除',
  '您的 {{providerDisplayName}} {{deviceName}} 已被成功删除。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #8c8c8c;">🗑️ {{providerDisplayName}} 已删除</h2>
    <div style="background: #fafafa; border-left: 4px solid #d9d9d9; padding: 15px; margin: 20px 0;">
      <p><strong>设备信息：</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>设备名称：{{deviceName}}</li>
        <li>设备类型：{{providerDisplayName}}</li>
        <li>删除时间：{{formatDate deletedAt}}</li>
      </ul>
    </div>
    <p>设备数据已永久删除，如需恢复请联系客服。</p>
  </div>',
  '【云手机】您的{{providerDisplayName}} {{deviceName}}已删除。',
  ARRAY['email', 'websocket'],
  '{"deviceName": "我的云手机", "deviceId": "device-12345", "providerType": "redroid", "providerDisplayName": "Redroid 容器设备", "deletedAt": "2025-10-29T14:00:00Z"}'::jsonb,
  '设备删除确认通知'
)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  email_template = EXCLUDED.email_template,
  sms_template = EXCLUDED.sms_template,
  default_data = EXCLUDED.default_data,
  updated_at = CURRENT_TIMESTAMP;

-- 8. 验证更新
SELECT
  code,
  name,
  type,
  title,
  LEFT(body, 50) as body_preview,
  updated_at
FROM notification_templates
WHERE code LIKE 'device.%'
ORDER BY code;

-- 执行完成提示
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '设备通知模板更新完成！';
  RAISE NOTICE '已更新 7 个设备相关模板，增加 Provider 信息展示';
  RAISE NOTICE '========================================';
END $$;
