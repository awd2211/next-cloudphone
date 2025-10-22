import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { TemplatesService } from '../templates.service';
import { initialTemplates } from './initial-templates.seed';

/**
 * 模板种子数据加载脚本
 *
 * 用途：将初始模板数据导入数据库
 * 使用：npx ts-node src/templates/seeds/seed-templates.ts
 */
async function bootstrap() {
  const logger = new Logger('TemplateSeed');

  try {
    logger.log('🌱 开始加载模板种子数据...');

    // 创建 NestJS 应用上下文
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // 获取 TemplatesService
    const templatesService = app.get(TemplatesService);

    // 统计数据
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // 遍历并创建模板
    for (const template of initialTemplates) {
      try {
        await templatesService.create(template as any);
        successCount++;
        logger.log(`✓ 已创建模板: ${template.code} - ${template.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipCount++;
          logger.warn(`⊘ 跳过已存在模板: ${template.code}`);
        } else {
          errorCount++;
          logger.error(`✗ 创建模板失败: ${template.code} - ${error.message}`);
        }
      }
    }

    // 输出统计信息
    logger.log('\n📊 种子数据加载完成！');
    logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.log(`✓ 成功创建: ${successCount} 个模板`);
    logger.log(`⊘ 跳过已存在: ${skipCount} 个模板`);
    logger.log(`✗ 创建失败: ${errorCount} 个模板`);
    logger.log(`📦 总计: ${initialTemplates.length} 个模板`);
    logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 关闭应用
    await app.close();

    process.exit(0);
  } catch (error) {
    logger.error('❌ 种子数据加载失败:', error);
    process.exit(1);
  }
}

// 执行种子数据加载
bootstrap();
