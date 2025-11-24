/**
 * 会话监听/插话 DTO
 */
import { IsString, IsOptional, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SupervisionMode {
  LISTEN = 'listen', // 仅监听，不可见
  WHISPER = 'whisper', // 悄悄话，仅客服可见
  BARGE = 'barge', // 插话，所有人可见
}

/**
 * 开始监听 DTO
 */
export class StartSupervisionDto {
  @ApiProperty({ enum: SupervisionMode, description: '监听模式' })
  @IsEnum(SupervisionMode)
  mode: SupervisionMode;
}

/**
 * 发送悄悄话 DTO
 */
export class WhisperMessageDto {
  @ApiProperty({ description: '悄悄话内容' })
  @IsString()
  content: string;
}

/**
 * 发送插话 DTO
 */
export class BargeMessageDto {
  @ApiProperty({ description: '插话内容' })
  @IsString()
  content: string;
}

/**
 * 监听会话信息
 */
export interface SupervisionSession {
  supervisorId: string;
  supervisorName: string;
  conversationId: string;
  mode: SupervisionMode;
  startedAt: Date;
}
