/**
 * 数据库模式验证工具
 *
 * 用于验证 TypeORM 实体与数据库表结构的一致性
 */

import { DataSource, EntityMetadata } from 'typeorm';

export interface SchemaValidationResult {
  isValid: boolean;
  entity: string;
  table: string;
  errors: SchemaValidationError[];
}

export interface SchemaValidationError {
  type: 'missing_column' | 'type_mismatch' | 'missing_table' | 'jsonb_mismatch';
  field?: string;
  expected?: string;
  actual?: string;
  message: string;
}

/**
 * 验证单个实体的模式
 */
export async function validateEntitySchema(
  dataSource: DataSource,
  entityClass: Function
): Promise<SchemaValidationResult> {
  const metadata = dataSource.getMetadata(entityClass);
  const tableName = metadata.tableName;
  const errors: SchemaValidationError[] = [];

  try {
    // 获取数据库表结构
    const queryRunner = dataSource.createQueryRunner();

    try {
      // 检查表是否存在
      const tableExists = await queryRunner.hasTable(tableName);

      if (!tableExists) {
        errors.push({
          type: 'missing_table',
          message: `Table '${tableName}' does not exist in database`,
        });

        return {
          isValid: false,
          entity: entityClass.name,
          table: tableName,
          errors,
        };
      }

      const table = await queryRunner.getTable(tableName);

      // 验证每个实体列
      for (const column of metadata.columns) {
        const columnName = column.databaseName;
        const dbColumn = table?.findColumnByName(columnName);

        if (!dbColumn) {
          errors.push({
            type: 'missing_column',
            field: columnName,
            message: `Column '${columnName}' defined in entity but not found in database table '${tableName}'`,
          });
          continue;
        }

        // 检查 JSONB 类型
        if (column.type === 'jsonb') {
          if (dbColumn.type !== 'jsonb') {
            errors.push({
              type: 'jsonb_mismatch',
              field: columnName,
              expected: 'jsonb',
              actual: dbColumn.type,
              message: `Column '${columnName}' should be JSONB but is '${dbColumn.type}'`,
            });
          }
        }

        // 检查其他类型不匹配
        if (column.type !== 'jsonb' && column.type !== dbColumn.type) {
          // 某些类型可能有别名,需要更智能的比较
          const entityType = normalizeType(String(column.type));
          const dbType = normalizeType(dbColumn.type);

          if (entityType !== dbType) {
            errors.push({
              type: 'type_mismatch',
              field: columnName,
              expected: String(column.type),
              actual: dbColumn.type,
              message: `Column '${columnName}' type mismatch: expected '${column.type}', got '${dbColumn.type}'`,
            });
          }
        }
      }
    } finally {
      await queryRunner.release();
    }
  } catch (error) {
    errors.push({
      type: 'missing_table',
      message: `Failed to validate schema: ${error.message}`,
    });
  }

  return {
    isValid: errors.length === 0,
    entity: entityClass.name,
    table: tableName,
    errors,
  };
}

/**
 * 批量验证多个实体
 */
export async function validateMultipleEntities(
  dataSource: DataSource,
  entities: Function[]
): Promise<SchemaValidationResult[]> {
  const results: SchemaValidationResult[] = [];

  for (const entity of entities) {
    const result = await validateEntitySchema(dataSource, entity);
    results.push(result);
  }

  return results;
}

/**
 * 标准化类型名称用于比较
 */
function normalizeType(type: string): string {
  const typeMap: Record<string, string> = {
    'character varying': 'varchar',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    'integer': 'int',
    'boolean': 'bool',
    'double precision': 'float',
  };

  const normalized = type.toLowerCase().trim();
  return typeMap[normalized] || normalized;
}

/**
 * 生成模式验证报告
 */
export function generateSchemaValidationReport(
  results: SchemaValidationResult[]
): string {
  const totalEntities = results.length;
  const validEntities = results.filter((r) => r.isValid).length;
  const invalidEntities = totalEntities - validEntities;

  let report = '# Database Schema Validation Report\n\n';
  report += `- Total Entities: ${totalEntities}\n`;
  report += `- Valid: ${validEntities}\n`;
  report += `- Invalid: ${invalidEntities}\n\n`;

  if (invalidEntities > 0) {
    report += '## Errors Found:\n\n';

    for (const result of results) {
      if (!result.isValid) {
        report += `### ${result.entity} (Table: ${result.table})\n\n`;

        for (const error of result.errors) {
          report += `- **${error.type}**: ${error.message}\n`;
          if (error.field) {
            report += `  - Field: ${error.field}\n`;
          }
          if (error.expected && error.actual) {
            report += `  - Expected: ${error.expected}, Actual: ${error.actual}\n`;
          }
          report += '\n';
        }
      }
    }
  } else {
    report += '✅ All entities match database schema!\n';
  }

  return report;
}

/**
 * Jest 测试助手 - 验证实体模式
 */
export function testEntitySchema(dataSource: DataSource, entity: Function) {
  it(`should have matching database schema for ${entity.name}`, async () => {
    const result = await validateEntitySchema(dataSource, entity);

    if (!result.isValid) {
      const errorMessages = result.errors.map((e) => e.message).join('\n');
      fail(`Schema validation failed for ${entity.name}:\n${errorMessages}`);
    }

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
}

/**
 * 验证所有 JSONB 字段
 */
export async function validateJsonbFields(
  dataSource: DataSource,
  entity: Function
): Promise<{
  entity: string;
  jsonbFields: string[];
  allValid: boolean;
  errors: string[];
}> {
  const metadata = dataSource.getMetadata(entity);
  const jsonbColumns = metadata.columns.filter((c) => c.type === 'jsonb');
  const jsonbFields = jsonbColumns.map((c) => c.databaseName);
  const errors: string[] = [];

  const queryRunner = dataSource.createQueryRunner();

  try {
    const table = await queryRunner.getTable(metadata.tableName);

    for (const jsonbCol of jsonbColumns) {
      const dbColumn = table?.findColumnByName(jsonbCol.databaseName);

      if (!dbColumn) {
        errors.push(`JSONB column '${jsonbCol.databaseName}' not found in database`);
      } else if (dbColumn.type !== 'jsonb') {
        errors.push(`Column '${jsonbCol.databaseName}' should be JSONB but is '${dbColumn.type}'`);
      }
    }
  } finally {
    await queryRunner.release();
  }

  return {
    entity: entity.name,
    jsonbFields,
    allValid: errors.length === 0,
    errors,
  };
}
