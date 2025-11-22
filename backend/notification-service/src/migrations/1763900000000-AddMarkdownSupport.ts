import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 添加 Markdown 支持
 * - content_format: 内容格式（plain/html/markdown）
 */
export class AddMarkdownSupport1763900000000 implements MigrationInterface {
  name = 'AddMarkdownSupport1763900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 添加 content_format 列
    await queryRunner.addColumn(
      'notification_templates',
      new TableColumn({
        name: 'content_format',
        type: 'varchar',
        length: '20',
        default: "'plain'",
        isNullable: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('notification_templates', 'content_format');
  }
}
