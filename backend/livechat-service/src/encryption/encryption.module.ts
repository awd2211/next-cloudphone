import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EncryptionController } from './encryption.controller';
import { EncryptionService } from './encryption.service';
import { EncryptionKey } from '../entities/encryption-key.entity';
import { EncryptionAudit } from '../entities/encryption-audit.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([EncryptionKey, EncryptionAudit]),
  ],
  controllers: [EncryptionController],
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
