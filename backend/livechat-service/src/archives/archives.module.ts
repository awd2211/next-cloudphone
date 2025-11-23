import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArchivesService } from './archives.service';
import { ArchivesController } from './archives.controller';
import { MessageArchive } from '../entities/message-archive.entity';
import { Message } from '../entities/message.entity';
import { Conversation } from '../entities/conversation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MessageArchive, Message, Conversation])],
  controllers: [ArchivesController],
  providers: [ArchivesService],
  exports: [ArchivesService],
})
export class ArchivesModule {}
