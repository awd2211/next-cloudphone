import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { Setting } from './entities/setting.entity';
import { UnifiedEncryptionModule } from '@cloudphone/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([Setting]),
    UnifiedEncryptionModule.forRoot({
      keyEnvName: 'ENCRYPTION_KEY',
    }),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
