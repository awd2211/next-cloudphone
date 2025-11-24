import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import {
  ConversationCollaboration,
  InternalMessage,
  Conversation,
  Agent,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConversationCollaboration,
      InternalMessage,
      Conversation,
      Agent,
    ]),
  ],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
