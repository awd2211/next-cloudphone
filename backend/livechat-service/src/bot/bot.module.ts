import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import {
  Bot,
  BotIntent,
  BotConversation,
  Conversation,
  Message,
  KnowledgeArticle,
} from '../entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bot,
      BotIntent,
      BotConversation,
      Conversation,
      Message,
      KnowledgeArticle,
    ]),
  ],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
