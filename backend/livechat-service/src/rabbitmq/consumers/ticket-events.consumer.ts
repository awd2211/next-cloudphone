import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { runInTraceContext } from '@cloudphone/shared';

@Injectable()
export class TicketEventsConsumer {
  private readonly logger = new Logger(TicketEventsConsumer.name);

  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
  ) {}

  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'ticket.*',
    queue: 'livechat-service.ticket.events',
    queueOptions: {
      deadLetterExchange: 'cloudphone.dlx',
      durable: true,
    },
  })
  async handleTicketEvent(event: any) {
    return runInTraceContext(event, async () => {
      this.logger.debug(`Received ticket event: ${event.type}`);

      // 工单状态变更时，更新关联的会话
      if (event.type === 'ticket.resolved' && event.metadata?.conversationId) {
        await this.conversationRepo.update(event.metadata.conversationId, {
          summary: `工单 #${event.ticketId} 已解决: ${event.resolution || ''}`,
        });
      }

      if (event.type === 'ticket.replied' && event.metadata?.conversationId) {
        // 可以在会话中显示工单回复通知
        this.logger.log(`Ticket ${event.ticketId} has new reply for conversation ${event.metadata.conversationId}`);
      }
    });
  }
}
