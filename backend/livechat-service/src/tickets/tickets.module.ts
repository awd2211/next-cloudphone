import { Module } from '@nestjs/common';
import { HttpClientModule } from '@cloudphone/shared';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule, HttpClientModule],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
