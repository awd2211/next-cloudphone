import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpClientModule } from '@cloudphone/shared';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { ChatModule } from '../chat/chat.module';
import { TicketLink } from '../entities/ticket-link.entity';
import { TicketTemplate } from '../entities/ticket-template.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TicketLink, TicketTemplate]),
    forwardRef(() => ChatModule),
    HttpClientModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
