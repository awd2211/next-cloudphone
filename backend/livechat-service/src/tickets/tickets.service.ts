import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '@cloudphone/shared';
import axios from 'axios';
import { ChatService } from '../chat/chat.service';

export interface CreateTicketRequest {
  conversationId: string;
  subject: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
}

export interface TicketInfo {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  private readonly userServiceUrl: string;

  constructor(
    private configService: ConfigService,
    private chatService: ChatService,
    private eventBus: EventBusService,
  ) {
    this.userServiceUrl = configService.get('USER_SERVICE_URL', 'http://localhost:30001');
  }

  async createTicketFromConversation(
    request: CreateTicketRequest,
    userId: string,
    tenantId: string,
    authToken: string,
  ): Promise<TicketInfo | null> {
    try {
      // 获取会话信息
      const conversation = await this.chatService.getConversation(request.conversationId, tenantId);

      // 获取最近的消息作为工单内容
      const messages = await this.chatService.getMessages(request.conversationId, tenantId, 20);

      const messageHistory = messages
        .reverse()
        .map((m) => `[${m.senderName || m.sender}]: ${m.content}`)
        .join('\n');

      const fullDescription = `${request.description}\n\n--- 聊天记录 ---\n${messageHistory}`;

      // 调用 user-service 创建工单
      const response = await axios.post(
        `${this.userServiceUrl}/tickets`,
        {
          subject: request.subject || conversation.subject || '在线客服会话转工单',
          description: fullDescription,
          priority: request.priority,
          category: request.category || 'livechat',
          metadata: {
            conversationId: request.conversationId,
            agentId: conversation.agentId,
          },
        },
        { headers: { Authorization: `Bearer ${authToken}` } },
      );

      const ticketId = response.data.id;

      // 更新会话关联工单
      await this.chatService.updateConversation(
        request.conversationId,
        { ticketId } as any,
        tenantId,
      );

      // 发布事件
      await this.eventBus.publish('cloudphone.events', 'livechat.ticket_created', {
        ticketId,
        conversationId: request.conversationId,
        userId,
        tenantId,
      });

      this.logger.log(`Created ticket ${ticketId} from conversation ${request.conversationId}`);

      return {
        id: ticketId,
        subject: response.data.subject,
        status: response.data.status,
        priority: response.data.priority,
        createdAt: response.data.createdAt,
      };

    } catch (error) {
      this.logger.error(`Failed to create ticket: ${error.message}`);
      return null;
    }
  }

  async getTicketInfo(ticketId: string, authToken: string): Promise<TicketInfo | null> {
    try {
      const response = await axios.get(`${this.userServiceUrl}/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      return {
        id: response.data.id,
        subject: response.data.subject,
        status: response.data.status,
        priority: response.data.priority,
        createdAt: response.data.createdAt,
      };

    } catch (error) {
      this.logger.error(`Failed to get ticket info: ${error.message}`);
      return null;
    }
  }
}
