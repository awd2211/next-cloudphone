/**
 * 数据库模式验证E2E测试
 *
 * 验证所有实体定义与数据库表结构的一致性
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  validateEntitySchema,
  validateMultipleEntities,
  generateSchemaValidationReport,
  testEntitySchema,
  validateJsonbFields,
} from '@cloudphone/shared/testing/schema-validator';

// 导入所有实体
import { User } from '../src/entities/user.entity';
import { Role } from '../src/entities/role.entity';
import { Permission } from '../src/entities/permission.entity';
import { Quota } from '../src/entities/quota.entity';
import { AuditLog } from '../src/entities/audit-log.entity';
import { ApiKey } from '../src/entities/api-key.entity';
import { Ticket } from '../src/tickets/entities/ticket.entity';
import { Setting } from '../src/settings/entities/setting.entity';

describe('Schema Validation (E2E)', () => {
  let dataSource: DataSource;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'cloudphone_user',
          entities: [User, Role, Permission, Quota, AuditLog, ApiKey, Ticket, Setting],
          synchronize: false, // 不自动同步,我们要验证现有结构
        }),
      ],
    }).compile();

    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  describe('Individual Entity Validation', () => {
    testEntitySchema(dataSource, User);
    testEntitySchema(dataSource, Role);
    testEntitySchema(dataSource, Permission);

    // ✅ 特别验证我们修复过的 Quota 实体
    it('should validate Quota entity with JSONB fields', async () => {
      const result = await validateEntitySchema(dataSource, Quota);

      // 详细错误信息
      if (!result.isValid) {
        console.error('Quota Schema Validation Errors:');
        result.errors.forEach((error) => {
          console.error(`  - ${error.message}`);
        });
      }

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // 特别检查 JSONB 字段
      const jsonbValidation = await validateJsonbFields(dataSource, Quota);
      expect(jsonbValidation.jsonbFields).toContain('limits');
      expect(jsonbValidation.jsonbFields).toContain('usage');
      expect(jsonbValidation.allValid).toBe(true);
    });

    testEntitySchema(dataSource, AuditLog);
    testEntitySchema(dataSource, ApiKey);
    testEntitySchema(dataSource, Ticket);
    testEntitySchema(dataSource, Setting);
  });

  describe('Batch Validation', () => {
    it('should validate all entities at once', async () => {
      const entities = [User, Role, Permission, Quota, AuditLog, ApiKey, Ticket, Setting];

      const results = await validateMultipleEntities(dataSource, entities);

      // 生成报告
      const report = generateSchemaValidationReport(results);
      console.log(report);

      // 检查是否有任何失败
      const failures = results.filter((r) => !r.isValid);
      expect(failures).toHaveLength(0);

      // 所有实体都应该有效
      results.forEach((result) => {
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('JSONB Field Validation', () => {
    it('should verify all JSONB fields in Quota entity', async () => {
      const result = await validateJsonbFields(dataSource, Quota);

      expect(result.allValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      // Quota 应该有两个 JSONB 字段
      expect(result.jsonbFields).toContain('limits');
      expect(result.jsonbFields).toContain('usage');
    });

    it('should verify JSONB fields in Permission entity', async () => {
      const result = await validateJsonbFields(dataSource, Permission);

      expect(result.allValid).toBe(true);

      // Permission 有多个 JSONB 字段
      expect(result.jsonbFields).toContain('conditions');
      expect(result.jsonbFields).toContain('dataFilter');
      expect(result.jsonbFields).toContain('fieldRules');
      expect(result.jsonbFields).toContain('metadata');
    });

    it('should verify JSONB fields in AuditLog entity', async () => {
      const result = await validateJsonbFields(dataSource, AuditLog);

      expect(result.allValid).toBe(true);
      expect(result.jsonbFields.length).toBeGreaterThan(0);
    });
  });

  describe('Specific Column Checks', () => {
    it('should verify Quota.limits is JSONB', async () => {
      const metadata = dataSource.getMetadata(Quota);
      const limitsColumn = metadata.columns.find((c) => c.propertyName === 'limits');

      expect(limitsColumn).toBeDefined();
      expect(limitsColumn?.type).toBe('jsonb');
    });

    it('should verify Quota.usage is JSONB', async () => {
      const metadata = dataSource.getMetadata(Quota);
      const usageColumn = metadata.columns.find((c) => c.propertyName === 'usage');

      expect(usageColumn).toBeDefined();
      expect(usageColumn?.type).toBe('jsonb');
    });

    it('should verify all entities have id column', async () => {
      const entities = [User, Role, Permission, Quota, AuditLog, ApiKey];

      for (const entity of entities) {
        const metadata = dataSource.getMetadata(entity);
        const idColumn = metadata.columns.find((c) => c.propertyName === 'id');

        expect(idColumn).toBeDefined();
      }
    });
  });

  describe('Migration Safety Checks', () => {
    it('should not have any unexpected column type changes', async () => {
      // 这个测试确保没有意外的类型更改
      const criticalEntities = [Quota, User, Role];

      for (const entity of criticalEntities) {
        const result = await validateEntitySchema(dataSource, entity);

        const typeMismatches = result.errors.filter((e) => e.type === 'type_mismatch');
        expect(typeMismatches).toHaveLength(0);
      }
    });

    it('should not have missing columns', async () => {
      const entities = [User, Role, Permission, Quota];

      for (const entity of entities) {
        const result = await validateEntitySchema(dataSource, entity);

        const missingColumns = result.errors.filter((e) => e.type === 'missing_column');

        if (missingColumns.length > 0) {
          console.error(`Missing columns in ${entity.name}:`, missingColumns);
        }

        expect(missingColumns).toHaveLength(0);
      }
    });
  });
});
