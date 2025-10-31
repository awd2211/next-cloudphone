import { DataSource } from 'typeorm';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { initialTemplates } from '../templates/seeds/initial-templates.seed';

/**
 * 初始化通知模板脚本
 *
 * 使用最新的完整模板种子数据 (30个模板)
 */

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

    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const template of initialTemplates) {
      const existing = await templateRepo.findOne({
        where: { code: template.code },
      });

      if (!existing) {
        const newTemplate = templateRepo.create(template);
        await templateRepo.save(newTemplate);
        console.log(`✅ 创建模板: ${template.name} (${template.code})`);
        created++;
      } else {
        // 更新现有模板
        Object.assign(existing, {
          name: template.name,
          type: template.type,
          title: template.title,
          body: template.body,
          emailTemplate: template.emailTemplate,
          smsTemplate: template.smsTemplate,
          channels: template.channels,
          defaultData: template.defaultData,
          language: template.language,
          isActive: template.isActive,
          description: template.description,
        });
        await templateRepo.save(existing);
        console.log(`🔄 更新模板: ${template.name} (${template.code})`);
        updated++;
      }
    }

    console.log('\n✅ 通知模板初始化完成！');
    console.log(`📊 统计信息:`);
    console.log(`   - 新创建: ${created} 个`);
    console.log(`   - 已更新: ${updated} 个`);
    console.log(`   - 总模板数: ${initialTemplates.length} 个`);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();
