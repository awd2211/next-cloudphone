import { DataSource } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationType, NotificationChannel } from '@cloudphone/shared';

/**
 * 初始化通知模板脚本
 */

const DEFAULT_TEMPLATES = [
  {
    code: 'device_created',
    name: '设备创建成功',
    type: NotificationType.DEVICE_CREATED,
    title: '设备创建成功',
    body: '您的设备 {{deviceName}} 已成功创建',
    emailTemplate: '<h2>设备创建成功</h2><p>您的设备 <strong>{{deviceName}}</strong> 已成功创建。</p>',
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    language: 'zh-CN',
    isActive: true,
  },
  {
    code: 'device_failed',
    name: '设备创建失败',
    type: NotificationType.SYSTEM_SECURITY_ALERT,
    title: '设备创建失败',
    body: '设备 {{deviceName}} 创建失败：{{reason}}',
    channels: [NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
  },
  {
    code: 'order_paid',
    name: '订单支付成功',
    type: NotificationType.BILLING_PAYMENT_SUCCESS,
    title: '支付成功',
    body: '订单 {{orderNo}} 支付成功，金额 ¥{{amount}}',
    channels: [NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
  },
  {
    code: 'low_balance',
    name: '余额不足告警',
    type: NotificationType.SYSTEM_SECURITY_ALERT,
    title: '余额不足提醒',
    body: '您的账户余额仅剩 ¥{{balance}}，请及时充值',
    emailTemplate: '<h2>余额不足提醒</h2><p>您的账户余额仅剩 <strong>¥{{balance}}</strong>，请及时充值。</p>',
    channels: [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL],
    language: 'zh-CN',
    isActive: true,
  },
  {
    code: 'invoice_generated',
    name: '账单生成通知',
    type: NotificationType.BILLING_LOW_BALANCE,
    title: '新账单生成',
    body: '您有一张新账单，金额 ¥{{amount}}，到期时间 {{dueDate}}',
    channels: [NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
  },
  {
    code: 'system_maintenance',
    name: '系统维护通知',
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: '系统维护通知',
    body: '系统将于 {{startTime}} 进行维护，预计持续 {{duration}} 分钟',
    channels: [NotificationChannel.WEBSOCKET],
    language: 'zh-CN',
    isActive: true,
  },
];

async function main() {
  console.log('🚀 开始初始化通知模板...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'cloudphone_notification',
    entities: [NotificationTemplate],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const templateRepo = dataSource.getRepository(NotificationTemplate);

    for (const template of DEFAULT_TEMPLATES) {
      const existing = await templateRepo.findOne({
        where: { code: template.code },
      });

      if (!existing) {
        const created = templateRepo.create(template);
        await templateRepo.save(created);
        console.log(`✅ 创建模板: ${template.name} (${template.code})`);
      } else {
        console.log(`⏭️  模板已存在: ${template.name} (${template.code})`);
      }
    }

    console.log('\n✅ 通知模板初始化完成！');
    console.log(`\n📊 模板总数: ${DEFAULT_TEMPLATES.length}`);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();

