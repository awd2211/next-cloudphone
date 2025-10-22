import { IsNotEmpty, IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '../../entities/app-audit-record.entity';

export class ApproveAppDto {
  @ApiProperty({
    description: '审核人员 ID',
    example: 'uuid-reviewer',
  })
  @IsNotEmpty()
  @IsUUID()
  reviewerId: string;

  @ApiPropertyOptional({
    description: '审核意见',
    example: '应用符合规范，批准上架',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class RejectAppDto {
  @ApiProperty({
    description: '审核人员 ID',
    example: 'uuid-reviewer',
  })
  @IsNotEmpty()
  @IsUUID()
  reviewerId: string;

  @ApiProperty({
    description: '拒绝原因',
    example: '应用包含违规内容',
  })
  @IsNotEmpty()
  @IsString()
  comment: string;
}

export class RequestChangesDto {
  @ApiProperty({
    description: '审核人员 ID',
    example: 'uuid-reviewer',
  })
  @IsNotEmpty()
  @IsUUID()
  reviewerId: string;

  @ApiProperty({
    description: '需要修改的内容',
    example: '请更新应用描述，补充功能说明',
  })
  @IsNotEmpty()
  @IsString()
  comment: string;
}

export class SubmitReviewDto {
  @ApiPropertyOptional({
    description: '提交说明',
    example: '已完成修改，请重新审核',
  })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class GetAuditRecordsQueryDto {
  @ApiPropertyOptional({
    description: '应用 ID',
    example: 'uuid-app',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({
    description: '审核人员 ID',
    example: 'uuid-reviewer',
  })
  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @ApiPropertyOptional({
    description: '审核动作',
    enum: AuditAction,
    example: AuditAction.APPROVE,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
  })
  @IsOptional()
  limit?: number;
}
