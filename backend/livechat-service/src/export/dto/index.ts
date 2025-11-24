import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ReportType, ExportFormat, ExportTaskStatus } from '../../entities';

// ========== Export Task DTOs ==========

export class CreateExportTaskDto {
  @IsString()
  name: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;

  @IsObject()
  queryParams: {
    startDate?: string;
    endDate?: string;
    agentIds?: string[];
    groupIds?: string[];
    status?: string[];
    tags?: string[];
    [key: string]: any;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsString()
  scheduleRule?: string;

  @IsOptional()
  notificationSettings?: {
    sendEmail?: boolean;
    emailRecipients?: string[];
    sendWebSocket?: boolean;
  };
}

export class QueryExportTasksDto {
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @IsOptional()
  @IsEnum(ExportTaskStatus)
  status?: ExportTaskStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

// ========== Report Template DTOs ==========

export class CreateReportTemplateDto {
  @IsString()
  name: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ExportFormat)
  defaultFormat?: ExportFormat;

  @IsOptional()
  @IsObject()
  defaultQueryParams?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultFields?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateReportTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ExportFormat)
  defaultFormat?: ExportFormat;

  @IsOptional()
  @IsObject()
  defaultQueryParams?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultFields?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// ========== Response Types ==========

export interface ReportFieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array';
  sortable?: boolean;
  filterable?: boolean;
  defaultSelected?: boolean;
}

export interface ReportTypeConfig {
  type: ReportType;
  name: string;
  description: string;
  supportedFormats: ExportFormat[];
  availableFields: ReportFieldDefinition[];
  requiredParams?: string[];
  maxRecords?: number;
}

export interface ExportTaskProgress {
  taskId: string;
  status: ExportTaskStatus;
  progress: number;
  totalRecords?: number;
  processedRecords: number;
  estimatedTimeRemaining?: number;
}

export interface ExportStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  totalFileSize: number;
  tasksByType: {
    reportType: ReportType;
    count: number;
  }[];
}
