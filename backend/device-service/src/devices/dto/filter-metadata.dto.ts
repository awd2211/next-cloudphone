import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 筛选选项
 */
export class FilterOption {
  @ApiProperty({ description: '选项值', example: 'online' })
  value: string;

  @ApiProperty({ description: '选项标签', example: '在线' })
  label: string;

  @ApiProperty({ description: '该选项的记录数量', example: 42 })
  count: number;
}

/**
 * 筛选器定义
 */
export class FilterDefinition {
  @ApiProperty({ description: '筛选器字段名', example: 'status' })
  field: string;

  @ApiProperty({ description: '筛选器显示标签', example: '状态' })
  label: string;

  @ApiProperty({
    description: '筛选器类型',
    enum: ['select', 'multiSelect', 'dateRange', 'numberRange', 'search'],
    example: 'select',
  })
  type: 'select' | 'multiSelect' | 'dateRange' | 'numberRange' | 'search';

  @ApiProperty({ description: '可用选项列表', type: [FilterOption] })
  options: FilterOption[];

  @ApiPropertyOptional({ description: '是否必填', default: false })
  required?: boolean;

  @ApiPropertyOptional({ description: '提示文本', example: '请选择设备状态' })
  placeholder?: string;

  @ApiPropertyOptional({ description: '默认值' })
  defaultValue?: any;
}

/**
 * 筛选元数据查询参数
 */
export class FilterMetadataQueryDto {
  @ApiPropertyOptional({
    description: '是否包含统计数量',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeCount?: boolean = true;

  @ApiPropertyOptional({
    description: '是否只返回有数据的选项',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyWithData?: boolean = false;
}

/**
 * 筛选元数据响应
 */
export class FilterMetadataResponseDto {
  @ApiProperty({ description: '筛选器列表', type: [FilterDefinition] })
  filters: FilterDefinition[];

  @ApiProperty({ description: '总记录数', example: 150 })
  totalRecords: number;

  @ApiProperty({ description: '最后更新时间', example: '2025-11-03T10:30:00.000Z' })
  lastUpdated: string;

  @ApiProperty({ description: '是否来自缓存', example: false })
  cached: boolean;
}

/**
 * 设备筛选元数据响应（扩展版，包含设备特有字段）
 */
export class DeviceFilterMetadataResponseDto extends FilterMetadataResponseDto {
  @ApiPropertyOptional({
    description: '快速筛选预设',
    example: {
      online: { status: 'online' },
      offline: { status: 'offline' },
      error: { status: 'error' },
    },
  })
  quickFilters?: Record<string, any>;
}
