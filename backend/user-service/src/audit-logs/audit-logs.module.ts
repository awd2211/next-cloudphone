import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLog } from '../entities/audit-log.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), AuthModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService, AuditInterceptor],
  exports: [AuditLogsService, AuditInterceptor],
})
export class AuditLogsModule {}
