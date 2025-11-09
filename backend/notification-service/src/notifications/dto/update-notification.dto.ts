import { PartialType } from '@nestjs/swagger';
import { CreateNotificationDto } from './create-notification.dto';

/**
 * 更新通知 DTO
 *
 * 继承自 CreateNotificationDto，所有字段都是可选的
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
