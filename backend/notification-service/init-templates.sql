-- ======================================
-- 通知模板表初始化脚本
-- 用途：创建表结构并导入18个初始模板
-- ======================================

-- 1. 删除旧表（如果存在）
DROP TABLE IF EXISTS notification_templates CASCADE;

-- 2. 创建通知模板表
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('system', 'device', 'order', 'billing', 'alert', 'message')),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  email_template TEXT,
  sms_template TEXT,
  channels TEXT[] NOT NULL,
  default_data JSONB,
  language VARCHAR(10) DEFAULT 'zh-CN',
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建索引
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_is_active ON notification_templates(is_active);
CREATE INDEX idx_notification_templates_type_is_active ON notification_templates(type, is_active);

-- 4. 插入初始模板数据

-- 用户相关模板 (5个)
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('user.registered', '用户注册成功', 'system', '欢迎加入云手机平台！', '您好 {{username}}，欢迎注册云手机平台！您的账号已成功创建。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1890ff;">欢迎加入云手机平台！</h2>
    <p>尊敬的 <strong>{{username}}</strong>，</p>
    <p>感谢您注册云手机平台！您的账号已成功创建。</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>注册信息：</strong></p>
      <ul style="list-style: none; padding: 0;">
        <li>用户名：{{username}}</li>
        <li>邮箱：{{email}}</li>
        <li>注册时间：{{formatDate registeredAt}}</li>
      </ul>
    </div>
    <a href="{{loginUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">登录平台</a>
  </div>',
  '【云手机】欢迎注册！您的账号{{username}}已创建成功。',
  ARRAY['email', 'sms', 'websocket'],
  '{"username": "用户", "email": "user@example.com", "loginUrl": "https://cloudphone.example.com/login"}'::jsonb,
  '用户注册成功后发送的欢迎通知'
),

('user.login_failed', '登录失败警告', 'alert', '账号登录失败警告', '检测到您的账号 {{username}} 有异常登录尝试，来自 IP：{{ipAddress}}。如非本人操作，请立即修改密码。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #ff4d4f;">⚠️ 账号安全警告</h2>
    <p>检测到异常登录尝试</p>
    <div style="background: #fff2e8; border-left: 4px solid #ff7a45; padding: 15px; margin: 20px 0;">
      <ul><li>IP地址：{{ipAddress}}</li><li>位置：{{location}}</li></ul>
    </div>
  </div>',
  '【云手机】警告：检测到账号{{username}}异常登录，IP:{{ipAddress}}。如非本人操作请立即修改密码。',
  ARRAY['email', 'sms', 'push'],
  '{"username": "用户", "ipAddress": "192.168.1.1", "location": "未知"}'::jsonb,
  '账号登录失败时的安全警告通知'
),

('user.password_reset', '密码重置请求', 'system', '密码重置请求', '您好 {{username}}，我们收到了您的密码重置请求。请点击链接重置密码，链接将在30分钟后失效。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2>密码重置请求</h2>
    <a href="{{resetUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">重置密码</a>
  </div>',
  '【云手机】密码重置验证码：{{code}}，30分钟内有效。',
  ARRAY['email', 'sms'],
  '{"username": "用户", "resetUrl": "https://cloudphone.example.com/reset", "code": "123456"}'::jsonb,
  '用户请求重置密码时发送的通知'
),

('user.password_changed', '密码修改成功', 'system', '密码修改成功', '您好 {{username}}，您的账号密码已成功修改。如非本人操作，请立即联系客服。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #52c41a;">✓ 密码修改成功</h2>
    <p>如非本人操作，请立即联系客服。</p>
  </div>',
  '【云手机】您的密码已修改成功。如非本人操作请立即联系客服。',
  ARRAY['email', 'sms', 'websocket'],
  '{"username": "用户"}'::jsonb,
  '密码修改成功后的确认通知'
),

('user.two_factor_enabled', '两步验证已启用', 'system', '两步验证已启用', '您好 {{username}}，您的账号已成功启用两步验证，安全性得到提升。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #52c41a;">🔐 两步验证已启用</h2>
    <p>账号安全性得到显著提升。</p>
  </div>',
  '【云手机】您已成功启用两步验证，账号安全性提升。',
  ARRAY['email', 'websocket'],
  '{"username": "用户"}'::jsonb,
  '用户启用两步验证后的确认通知'
);

-- 设备相关模板 (3个)
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('device.created', '云手机创建成功', 'system', '云手机创建成功', '您的云手机 {{deviceName}} 已创建成功！设备ID: {{deviceId}}，可以开始使用了。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #52c41a;">✓ 云手机创建成功</h2>
    <p>设备名称：{{deviceName}}</p>
    <p>设备ID：{{deviceId}}</p>
    <a href="{{deviceUrl}}" style="display: inline-block; background: #52c41a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">立即使用</a>
  </div>',
  '【云手机】您的云手机{{deviceName}}已创建成功，现在可以使用了！',
  ARRAY['email', 'websocket', 'push'],
  '{"deviceName": "我的云手机", "deviceId": "device-12345", "deviceUrl": "https://cloudphone.example.com/devices/device-12345"}'::jsonb,
  '云手机创建成功后的通知'
),

('device.creation_failed', '云手机创建失败', 'alert', '云手机创建失败', '抱歉，云手机 {{deviceName}} 创建失败。原因：{{reason}}。请重试或联系客服。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #ff4d4f;">✗ 云手机创建失败</h2>
    <p>失败原因：{{reason}}</p>
  </div>',
  '【云手机】云手机{{deviceName}}创建失败：{{reason}}。请重试或联系客服。',
  ARRAY['email', 'websocket', 'push'],
  '{"deviceName": "我的云手机", "reason": "资源不足"}'::jsonb,
  '云手机创建失败时的通知'
),

('device.error', '云手机运行异常', 'alert', '云手机运行异常', '您的云手机 {{deviceName}} 出现异常：{{errorMessage}}。我们正在处理，请稍后查看。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #ff4d4f;">⚠️ 云手机运行异常</h2>
    <p>异常描述：{{errorMessage}}</p>
  </div>',
  '【云手机】您的云手机{{deviceName}}出现异常：{{errorMessage}}。',
  ARRAY['email', 'websocket', 'push'],
  '{"deviceName": "我的云手机", "errorMessage": "系统异常"}'::jsonb,
  '云手机运行异常时的告警通知'
);

-- 账单相关模板 (4个)
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('billing.payment_success', '支付成功通知', 'system', '支付成功', '您已成功支付 {{formatCurrency amount}}，订单号：{{orderId}}。感谢您的使用！',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #52c41a;">✓ 支付成功</h2>
    <p>订单号：{{orderId}}</p>
    <p>支付金额：<strong>{{formatCurrency amount}}</strong></p>
  </div>',
  '【云手机】支付成功！金额{{formatCurrency amount}}，订单{{orderId}}。',
  ARRAY['email', 'sms', 'websocket'],
  '{"amount": 100.00, "orderId": "ORD-001"}'::jsonb,
  '支付成功后的确认通知'
),

('billing.payment_failed', '支付失败通知', 'alert', '支付失败', '您的支付失败，订单号：{{orderId}}，原因：{{reason}}。请重试或更换支付方式。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #ff4d4f;">✗ 支付失败</h2>
    <p>失败原因：{{reason}}</p>
  </div>',
  '【云手机】支付失败，订单{{orderId}}，原因：{{reason}}。',
  ARRAY['email', 'sms', 'websocket'],
  '{"orderId": "ORD-001", "reason": "余额不足"}'::jsonb,
  '支付失败时的告警通知'
),

('billing.low_balance', '余额不足提醒', 'alert', '余额不足提醒', '您的账户余额仅剩 {{formatCurrency balance}}，为避免服务中断，请及时充值。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #faad14;">⚠️ 余额不足提醒</h2>
    <p>当前余额：<strong>{{formatCurrency balance}}</strong></p>
    <p>预计可用：{{daysRemaining}} 天</p>
  </div>',
  '【云手机】余额不足！当前{{formatCurrency balance}}，预计{{daysRemaining}}天后服务暂停，请及时充值。',
  ARRAY['email', 'sms', 'websocket', 'push'],
  '{"balance": 10.00, "daysRemaining": 2}'::jsonb,
  '账户余额不足时的提醒通知'
),

('billing.invoice_generated', '账单生成通知', 'system', '账单已生成', '您的{{month}}月账单已生成，总金额 {{formatCurrency totalAmount}}。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #1890ff;">📄 账单已生成</h2>
    <p>账单月份：{{month}}</p>
    <p>总金额：<strong>{{formatCurrency totalAmount}}</strong></p>
  </div>',
  '【云手机】{{month}}月账单已生成，总额{{formatCurrency totalAmount}}。',
  ARRAY['email', 'websocket'],
  '{"month": "2025年1月", "totalAmount": 150.00}'::jsonb,
  '月度账单生成后的通知'
);

-- 应用相关模板 (2个)
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('app.installed', '应用安装成功', 'system', '应用安装成功', '应用 {{appName}} 已在云手机 {{deviceName}} 上安装成功！',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #52c41a;">✓ 应用安装成功</h2>
    <p>应用：{{appName}}</p>
    <p>设备：{{deviceName}}</p>
  </div>',
  '【云手机】应用{{appName}}已在{{deviceName}}上安装成功！',
  ARRAY['websocket', 'push'],
  '{"appName": "微信", "deviceName": "我的云手机"}'::jsonb,
  '应用安装成功后的通知'
),

('app.install_failed', '应用安装失败', 'alert', '应用安装失败', '应用 {{appName}} 在云手机 {{deviceName}} 上安装失败，原因：{{reason}}。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #ff4d4f;">✗ 应用安装失败</h2>
    <p>失败原因：{{reason}}</p>
  </div>',
  '【云手机】应用{{appName}}安装失败：{{reason}}。',
  ARRAY['websocket', 'push'],
  '{"appName": "微信", "deviceName": "我的云手机", "reason": "存储空间不足"}'::jsonb,
  '应用安装失败时的告警通知'
);

-- 系统相关模板 (1个)
INSERT INTO notification_templates (code, name, type, title, body, email_template, sms_template, channels, default_data, description) VALUES
('system.maintenance', '系统维护通知', 'system', '系统维护通知', '系统将于 {{formatDate startTime}} 进行维护，预计持续 {{duration}} 小时，期间服务可能中断。',
  '<div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2 style="color: #1890ff;">🔧 系统维护通知</h2>
    <p>开始时间：{{formatDate startTime}}</p>
    <p>持续时间：{{duration}} 小时</p>
    <p style="color: #ff4d4f;">⚠️ 维护期间，部分服务可能无法使用。</p>
  </div>',
  '【云手机】系统将于{{formatDate startTime}}维护{{duration}}小时，服务可能中断。',
  ARRAY['email', 'sms', 'websocket', 'push'],
  '{"duration": 2}'::jsonb,
  '系统维护前的提前通知'
);

-- 5. 更新统计信息
SELECT COUNT(*) as template_count FROM notification_templates;

-- 完成
\echo '✅ 成功导入 15 个通知模板！'
