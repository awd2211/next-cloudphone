import { NotificationType, NotificationChannel } from '../../entities/notification.entity';

/**
 * 初始通知模板种子数据
 *
 * 用途：为系统提供默认的通知模板，支持多渠道和 Handlebars 模板语法
 */
export const initialTemplates = [
  // ==================== 用户相关模板 ====================

  {
    code: 'user.registered',
    name: '用户注册成功',
    type: NotificationType.SYSTEM,
    title: '欢迎加入云手机平台！',
    body: '您好 {{username}}，欢迎注册云手机平台！您的账号已成功创建。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
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
        <p>立即开始使用您的云手机服务吧！</p>
        <a href="{{loginUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          登录平台
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          如果您没有注册账号，请忽略此邮件。
        </p>
      </div>
    `,
    smsTemplate: '【云手机】欢迎注册！您的账号{{username}}已创建成功。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      username: '用户',
      email: 'user@example.com',
      registeredAt: new Date(),
      loginUrl: 'https://cloudphone.example.com/login',
    },
    description: '用户注册成功后发送的欢迎通知',
  },

  {
    code: 'user.login_failed',
    name: '登录失败警告',
    type: NotificationType.ALERT,
    title: '账号登录失败警告',
    body: '检测到您的账号 {{username}} 在 {{formatDate attemptTime}} 有异常登录尝试，来自 IP：{{ipAddress}}。如非本人操作，请立即修改密码。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4d4f;">⚠️ 账号安全警告</h2>
        <p>尊敬的 <strong>{{username}}</strong>，</p>
        <p>我们检测到您的账号有异常登录尝试：</p>
        <div style="background: #fff2e8; border-left: 4px solid #ff7a45; padding: 15px; margin: 20px 0;">
          <p><strong>登录详情：</strong></p>
          <ul>
            <li>时间：{{formatDate attemptTime}}</li>
            <li>IP地址：{{ipAddress}}</li>
            <li>位置：{{location}}</li>
            <li>设备：{{device}}</li>
          </ul>
        </div>
        <p style="color: #ff4d4f; font-weight: bold;">如果这不是您本人的操作，请立即采取以下措施：</p>
        <ol>
          <li>立即修改账号密码</li>
          <li>启用两步验证</li>
          <li>检查账号安全设置</li>
        </ol>
        <a href="{{securityUrl}}" style="display: inline-block; background: #ff4d4f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          查看安全设置
        </a>
      </div>
    `,
    smsTemplate: '【云手机】警告：检测到账号{{username}}异常登录尝试，IP:{{ipAddress}}。如非本人操作请立即修改密码。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PUSH],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      username: '用户',
      attemptTime: new Date(),
      ipAddress: '192.168.1.1',
      location: '未知',
      device: '未知设备',
      securityUrl: 'https://cloudphone.example.com/security',
    },
    description: '账号登录失败时的安全警告通知',
  },

  {
    code: 'user.password_reset',
    name: '密码重置请求',
    type: NotificationType.SYSTEM,
    title: '密码重置请求',
    body: '您好 {{username}}，我们收到了您的密码重置请求。请点击链接重置密码，链接将在30分钟后失效。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">密码重置请求</h2>
        <p>尊敬的 <strong>{{username}}</strong>，</p>
        <p>我们收到了您的密码重置请求。请点击下方按钮重置密码：</p>
        <a href="{{resetUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-size: 16px;">
          重置密码
        </a>
        <p style="color: #999;">或复制以下链接到浏览器：</p>
        <p style="background: #f5f5f5; padding: 10px; word-break: break-all; font-size: 12px;">
          {{resetUrl}}
        </p>
        <div style="background: #fff7e6; border-left: 4px solid #faad14; padding: 15px; margin: 20px 0;">
          <p><strong>⚠️ 安全提示：</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li>此链接将在 <strong>30分钟</strong> 后失效</li>
            <li>如果不是您本人操作，请忽略此邮件</li>
            <li>请勿将此链接分享给他人</li>
          </ul>
        </div>
      </div>
    `,
    smsTemplate: '【云手机】密码重置验证码：{{code}}，30分钟内有效。如非本人操作请忽略。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      username: '用户',
      resetUrl: 'https://cloudphone.example.com/reset-password?token=xxx',
      code: '123456',
      expiresIn: '30分钟',
    },
    description: '用户请求重置密码时发送的通知',
  },

  {
    code: 'user.password_changed',
    name: '密码修改成功',
    type: NotificationType.SYSTEM,
    title: '密码修改成功',
    body: '您好 {{username}}，您的账号密码已于 {{formatDate changedAt}} 成功修改。如非本人操作，请立即联系客服。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #52c41a;">✓ 密码修改成功</h2>
        <p>尊敬的 <strong>{{username}}</strong>，</p>
        <p>您的账号密码已成功修改。</p>
        <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0;">
          <p><strong>修改信息：</strong></p>
          <ul>
            <li>修改时间：{{formatDate changedAt}}</li>
            <li>IP地址：{{ipAddress}}</li>
            <li>设备：{{device}}</li>
          </ul>
        </div>
        <p style="color: #ff4d4f;">⚠️ 如果这不是您本人的操作，请立即联系客服。</p>
        <a href="{{supportUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          联系客服
        </a>
      </div>
    `,
    smsTemplate: '【云手机】您的密码已修改成功。如非本人操作请立即联系客服。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      username: '用户',
      changedAt: new Date(),
      ipAddress: '192.168.1.1',
      device: '未知设备',
      supportUrl: 'https://cloudphone.example.com/support',
    },
    description: '密码修改成功后的确认通知',
  },

  {
    code: 'user.two_factor_enabled',
    name: '两步验证已启用',
    type: NotificationType.SYSTEM,
    title: '两步验证已启用',
    body: '您好 {{username}}，您的账号已成功启用两步验证，安全性得到提升。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #52c41a;">🔐 两步验证已启用</h2>
        <p>尊敬的 <strong>{{username}}</strong>，</p>
        <p>恭喜！您的账号已成功启用两步验证功能，账号安全性得到显著提升。</p>
        <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0;">
          <p><strong>✓ 两步验证优势：</strong></p>
          <ul>
            <li>防止账号被盗</li>
            <li>保护个人隐私</li>
            <li>增强登录安全</li>
          </ul>
        </div>
        <p>从现在开始，每次登录都需要输入动态验证码。</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          请妥善保管您的备用恢复码，在无法使用验证器时可用于账号恢复。
        </p>
      </div>
    `,
    smsTemplate: '【云手机】您已成功启用两步验证，账号安全性提升。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      username: '用户',
      enabledAt: new Date(),
    },
    description: '用户启用两步验证后的确认通知',
  },

  // ==================== 设备相关模板 ====================

  {
    code: 'device.created',
    name: '云手机创建成功',
    type: NotificationType.SYSTEM,
    title: '云手机创建成功',
    body: '您的云手机 {{deviceName}} 已创建成功！设备ID: {{deviceId}}，可以开始使用了。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #52c41a;">✓ 云手机创建成功</h2>
        <p>尊敬的用户，</p>
        <p>您的云手机已成功创建并准备就绪！</p>
        <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0;">
          <p><strong>设备信息：</strong></p>
          <ul>
            <li>设备名称：{{deviceName}}</li>
            <li>设备ID：{{deviceId}}</li>
            <li>规格配置：{{spec}}</li>
            <li>创建时间：{{formatDate createdAt}}</li>
          </ul>
        </div>
        <a href="{{deviceUrl}}" style="display: inline-block; background: #52c41a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          立即使用
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          提示：首次启动可能需要1-2分钟初始化时间。
        </p>
      </div>
    `,
    smsTemplate: '【云手机】您的云手机{{deviceName}}已创建成功，现在可以使用了！',
    channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      deviceName: '我的云手机',
      deviceId: 'device-12345',
      spec: '2核4G',
      createdAt: new Date(),
      deviceUrl: 'https://cloudphone.example.com/devices/device-12345',
    },
    description: '云手机创建成功后的通知',
  },

  {
    code: 'device.creation_failed',
    name: '云手机创建失败',
    type: NotificationType.ALERT,
    title: '云手机创建失败',
    body: '抱歉，云手机 {{deviceName}} 创建失败。原因：{{reason}}。请重试或联系客服。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4d4f;">✗ 云手机创建失败</h2>
        <p>尊敬的用户，</p>
        <p>很抱歉，您的云手机创建失败。</p>
        <div style="background: #fff2e8; border-left: 4px solid #ff7a45; padding: 15px; margin: 20px 0;">
          <p><strong>失败信息：</strong></p>
          <ul>
            <li>设备名称：{{deviceName}}</li>
            <li>失败原因：{{reason}}</li>
            <li>失败时间：{{formatDate failedAt}}</li>
          </ul>
        </div>
        <p><strong>建议操作：</strong></p>
        <ol>
          <li>检查账户余额是否充足</li>
          <li>确认配置参数是否正确</li>
          <li>稍后重试创建</li>
          <li>如问题持续，请联系客服</li>
        </ol>
        <a href="{{supportUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          联系客服
        </a>
      </div>
    `,
    smsTemplate: '【云手机】云手机{{deviceName}}创建失败：{{reason}}。请重试或联系客服。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      deviceName: '我的云手机',
      reason: '资源不足',
      failedAt: new Date(),
      supportUrl: 'https://cloudphone.example.com/support',
    },
    description: '云手机创建失败时的通知',
  },

  {
    code: 'device.error',
    name: '云手机运行异常',
    type: NotificationType.ALERT,
    title: '云手机运行异常',
    body: '您的云手机 {{deviceName}} 出现异常：{{errorMessage}}。我们正在处理，请稍后查看。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4d4f;">⚠️ 云手机运行异常</h2>
        <p>尊敬的用户，</p>
        <p>您的云手机检测到运行异常。</p>
        <div style="background: #fff1f0; border-left: 4px solid #ff4d4f; padding: 15px; margin: 20px 0;">
          <p><strong>异常信息：</strong></p>
          <ul>
            <li>设备名称：{{deviceName}}</li>
            <li>设备ID：{{deviceId}}</li>
            <li>异常描述：{{errorMessage}}</li>
            <li>发生时间：{{formatDate errorTime}}</li>
          </ul>
        </div>
        <p>我们的技术团队已收到通知，正在处理此问题。</p>
        <p>您可以尝试以下操作：</p>
        <ol>
          <li>重启云手机</li>
          <li>检查应用运行状态</li>
          <li>查看错误日志</li>
        </ol>
        <a href="{{deviceUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          查看设备详情
        </a>
      </div>
    `,
    smsTemplate: '【云手机】您的云手机{{deviceName}}出现异常：{{errorMessage}}。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      deviceName: '我的云手机',
      deviceId: 'device-12345',
      errorMessage: '系统异常',
      errorTime: new Date(),
      deviceUrl: 'https://cloudphone.example.com/devices/device-12345',
    },
    description: '云手机运行异常时的告警通知',
  },

  // ==================== 账单相关模板 ====================

  {
    code: 'billing.payment_success',
    name: '支付成功通知',
    type: NotificationType.SYSTEM,
    title: '支付成功',
    body: '您已成功支付 {{formatCurrency amount}}，订单号：{{orderId}}。感谢您的使用！',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #52c41a;">✓ 支付成功</h2>
        <p>尊敬的用户，</p>
        <p>您的支付已成功完成！</p>
        <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0;">
          <p><strong>支付详情：</strong></p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0;">订单号：</td>
              <td style="padding: 5px 0;"><strong>{{orderId}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">支付金额：</td>
              <td style="padding: 5px 0; color: #52c41a; font-size: 20px;"><strong>{{formatCurrency amount}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">支付方式：</td>
              <td style="padding: 5px 0;">{{paymentMethod}}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">支付时间：</td>
              <td style="padding: 5px 0;">{{formatDate paidAt}}</td>
            </tr>
          </table>
        </div>
        <p>您的账户余额已更新：<strong>{{formatCurrency balance}}</strong></p>
        <a href="{{invoiceUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          查看发票
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          感谢您使用云手机服务！
        </p>
      </div>
    `,
    smsTemplate: '【云手机】支付成功！金额{{formatCurrency amount}}，订单{{orderId}}。感谢使用！',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      amount: 100.00,
      orderId: 'ORD-20250122-001',
      paymentMethod: '支付宝',
      paidAt: new Date(),
      balance: 500.00,
      invoiceUrl: 'https://cloudphone.example.com/invoices/001',
    },
    description: '支付成功后的确认通知',
  },

  {
    code: 'billing.payment_failed',
    name: '支付失败通知',
    type: NotificationType.ALERT,
    title: '支付失败',
    body: '您的支付失败，订单号：{{orderId}}，原因：{{reason}}。请重试或更换支付方式。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4d4f;">✗ 支付失败</h2>
        <p>尊敬的用户，</p>
        <p>很抱歉，您的支付未能成功完成。</p>
        <div style="background: #fff1f0; border-left: 4px solid #ff4d4f; padding: 15px; margin: 20px 0;">
          <p><strong>支付信息：</strong></p>
          <ul>
            <li>订单号：{{orderId}}</li>
            <li>支付金额：{{formatCurrency amount}}</li>
            <li>失败原因：{{reason}}</li>
            <li>失败时间：{{formatDate failedAt}}</li>
          </ul>
        </div>
        <p><strong>可能的原因：</strong></p>
        <ul>
          <li>银行卡余额不足</li>
          <li>支付密码错误</li>
          <li>网络连接问题</li>
          <li>支付限额限制</li>
        </ul>
        <p>建议您：</p>
        <ol>
          <li>检查账户余额</li>
          <li>更换支付方式</li>
          <li>稍后重试</li>
        </ol>
        <a href="{{retryUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          重新支付
        </a>
      </div>
    `,
    smsTemplate: '【云手机】支付失败，订单{{orderId}}，原因：{{reason}}。请重试。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      orderId: 'ORD-20250122-001',
      amount: 100.00,
      reason: '余额不足',
      failedAt: new Date(),
      retryUrl: 'https://cloudphone.example.com/orders/retry/001',
    },
    description: '支付失败时的告警通知',
  },

  {
    code: 'billing.low_balance',
    name: '余额不足提醒',
    type: NotificationType.ALERT,
    title: '余额不足提醒',
    body: '您的账户余额仅剩 {{formatCurrency balance}}，为避免服务中断，请及时充值。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #faad14;">⚠️ 余额不足提醒</h2>
        <p>尊敬的用户，</p>
        <p>您的账户余额不足，可能影响服务的正常使用。</p>
        <div style="background: #fffbe6; border-left: 4px solid #faad14; padding: 15px; margin: 20px 0;">
          <p><strong>账户信息：</strong></p>
          <ul>
            <li>当前余额：<span style="color: #faad14; font-size: 20px; font-weight: bold;">{{formatCurrency balance}}</span></li>
            <li>预计可用天数：<strong>{{daysRemaining}} 天</strong></li>
            <li>每日消费：{{formatCurrency dailyCost}}</li>
          </ul>
        </div>
        <p style="color: #ff4d4f;"><strong>⚠️ 重要提示：</strong></p>
        <p>余额不足时，您的云手机服务可能会被暂停。为避免影响使用，请尽快充值。</p>
        <a href="{{rechargeUrl}}" style="display: inline-block; background: #faad14; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-size: 16px;">
          立即充值
        </a>
      </div>
    `,
    smsTemplate: '【云手机】余额不足！当前{{formatCurrency balance}}，预计{{daysRemaining}}天后服务暂停，请及时充值。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      balance: 10.00,
      daysRemaining: 2,
      dailyCost: 5.00,
      rechargeUrl: 'https://cloudphone.example.com/recharge',
    },
    description: '账户余额不足时的提醒通知',
  },

  {
    code: 'billing.invoice_generated',
    name: '账单生成通知',
    type: NotificationType.SYSTEM,
    title: '账单已生成',
    body: '您的{{month}}月账单已生成，总金额 {{formatCurrency totalAmount}}。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">📄 账单已生成</h2>
        <p>尊敬的用户，</p>
        <p>您的月度账单已生成，请查收。</p>
        <div style="background: #f0f5ff; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0;">
          <p><strong>账单详情：</strong></p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0;">账单月份：</td>
              <td style="padding: 5px 0;"><strong>{{month}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">账单号：</td>
              <td style="padding: 5px 0;">{{invoiceNumber}}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">总金额：</td>
              <td style="padding: 5px 0; color: #1890ff; font-size: 20px;"><strong>{{formatCurrency totalAmount}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">生成时间：</td>
              <td style="padding: 5px 0;">{{formatDate generatedAt}}</td>
            </tr>
          </table>
        </div>
        <p><strong>费用明细：</strong></p>
        <ul>
          <li>云手机租用：{{formatCurrency deviceCost}}</li>
          <li>流量费用：{{formatCurrency trafficCost}}</li>
          <li>其他费用：{{formatCurrency otherCost}}</li>
        </ul>
        <a href="{{invoiceUrl}}" style="display: inline-block; background: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          查看账单详情
        </a>
      </div>
    `,
    smsTemplate: '【云手机】{{month}}月账单已生成，总额{{formatCurrency totalAmount}}。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      month: '2025年1月',
      invoiceNumber: 'INV-202501-001',
      totalAmount: 150.00,
      deviceCost: 100.00,
      trafficCost: 30.00,
      otherCost: 20.00,
      generatedAt: new Date(),
      invoiceUrl: 'https://cloudphone.example.com/invoices/INV-202501-001',
    },
    description: '月度账单生成后的通知',
  },

  // ==================== 应用相关模板 ====================

  {
    code: 'app.installed',
    name: '应用安装成功',
    type: NotificationType.SYSTEM,
    title: '应用安装成功',
    body: '应用 {{appName}} 已在云手机 {{deviceName}} 上安装成功！',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #52c41a;">✓ 应用安装成功</h2>
        <p>尊敬的用户，</p>
        <p>应用已成功安装到您的云手机！</p>
        <div style="background: #f6ffed; border-left: 4px solid #52c41a; padding: 15px; margin: 20px 0;">
          <p><strong>安装信息：</strong></p>
          <ul>
            <li>应用名称：{{appName}}</li>
            <li>应用版本：{{appVersion}}</li>
            <li>设备名称：{{deviceName}}</li>
            <li>安装时间：{{formatDate installedAt}}</li>
          </ul>
        </div>
        <p>现在您可以在云手机上使用此应用了！</p>
        <a href="{{deviceUrl}}" style="display: inline-block; background: #52c41a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
          打开云手机
        </a>
      </div>
    `,
    smsTemplate: '【云手机】应用{{appName}}已在{{deviceName}}上安装成功！',
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      appName: '微信',
      appVersion: '8.0.0',
      deviceName: '我的云手机',
      installedAt: new Date(),
      deviceUrl: 'https://cloudphone.example.com/devices/device-12345',
    },
    description: '应用安装成功后的通知',
  },

  {
    code: 'app.install_failed',
    name: '应用安装失败',
    type: NotificationType.ALERT,
    title: '应用安装失败',
    body: '应用 {{appName}} 在云手机 {{deviceName}} 上安装失败，原因：{{reason}}。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4d4f;">✗ 应用安装失败</h2>
        <p>尊敬的用户，</p>
        <p>很抱歉，应用安装失败。</p>
        <div style="background: #fff2e8; border-left: 4px solid #ff7a45; padding: 15px; margin: 20px 0;">
          <p><strong>失败信息：</strong></p>
          <ul>
            <li>应用名称：{{appName}}</li>
            <li>设备名称：{{deviceName}}</li>
            <li>失败原因：{{reason}}</li>
            <li>失败时间：{{formatDate failedAt}}</li>
          </ul>
        </div>
        <p><strong>可能的原因：</strong></p>
        <ul>
          <li>存储空间不足</li>
          <li>应用版本不兼容</li>
          <li>网络连接问题</li>
          <li>设备性能限制</li>
        </ul>
        <p>建议您检查设备状态后重试。</p>
      </div>
    `,
    smsTemplate: '【云手机】应用{{appName}}安装失败：{{reason}}。',
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      appName: '微信',
      deviceName: '我的云手机',
      reason: '存储空间不足',
      failedAt: new Date(),
    },
    description: '应用安装失败时的告警通知',
  },

  // ==================== 系统相关模板 ====================

  {
    code: 'system.maintenance',
    name: '系统维护通知',
    type: NotificationType.SYSTEM,
    title: '系统维护通知',
    body: '系统将于 {{formatDate startTime}} 进行维护，预计持续 {{duration}} 小时，期间服务可能中断，请提前做好准备。',
    emailTemplate: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1890ff;">🔧 系统维护通知</h2>
        <p>尊敬的用户，</p>
        <p>为了提供更好的服务，我们计划进行系统维护。</p>
        <div style="background: #fff7e6; border-left: 4px solid #faad14; padding: 15px; margin: 20px 0;">
          <p><strong>维护信息：</strong></p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0;">开始时间：</td>
              <td style="padding: 5px 0;"><strong>{{formatDate startTime}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">结束时间：</td>
              <td style="padding: 5px 0;"><strong>{{formatDate endTime}}</strong></td>
            </tr>
            <tr>
              <td style="padding: 5px 0;">持续时间：</td>
              <td style="padding: 5px 0;"><strong>{{duration}} 小时</strong></td>
            </tr>
          </table>
        </div>
        <p><strong>维护内容：</strong></p>
        <ul>
          <li>{{maintenanceType}}</li>
          <li>性能优化</li>
          <li>安全更新</li>
        </ul>
        <p style="color: #ff4d4f;">⚠️ 维护期间，部分服务可能无法使用，请提前做好准备。</p>
        <p>给您带来的不便，敬请谅解！</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          如有疑问，请联系客服：support@cloudphone.com
        </p>
      </div>
    `,
    smsTemplate: '【云手机】系统将于{{formatDate startTime}}维护{{duration}}小时，服务可能中断，请提前准备。',
    channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.WEBSOCKET, NotificationChannel.PUSH],
    language: 'zh-CN',
    isActive: true,
    defaultData: {
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小时后
      endTime: new Date(Date.now() + 26 * 60 * 60 * 1000), // 26小时后
      duration: 2,
      maintenanceType: '系统升级',
    },
    description: '系统维护前的提前通知',
  },
];
