import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService, ConsulService, HttpClientService } from '@cloudphone/shared';
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
  private readonly fallbackUrl: string;

  constructor(
    private configService: ConfigService,
    private chatService: ChatService,
    private eventBus: EventBusService,
    private consulService: ConsulService,
    private httpClient: HttpClientService,
  ) {
    // 降级 URL（当 Consul 不可用时使用）
    this.fallbackUrl = configService.get('USER_SERVICE_URL', 'http://localhost:30001');
  }

  /**
   * 获取用户服务地址（优先使用 Consul 服务发现）
   */
  private async getUserServiceUrl(): Promise<string> {
    try {
      return await this.consulService.getService('user-service');
    } catch (error) {
      this.logger.warn(`Consul service discovery failed, using fallback URL: ${this.fallbackUrl}`);
      return this.fallbackUrl;
    }
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

      // 调用 user-service 创建工单（使用服务发现和断路器）
      const baseUrl = await this.getUserServiceUrl();
      const response = await this.httpClient.postWithCircuitBreaker<any>(
        'user-service',
        `${baseUrl}/tickets`,
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

      if (!response) {
        throw new Error('Failed to create ticket - empty response');
      }

      const ticketId = response.id;

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
        subject: response.subject,
        status: response.status,
        priority: response.priority,
        createdAt: response.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to create ticket: ${error.message}`);
      return null;
    }
  }

  async getTicketInfo(ticketId: string, authToken: string): Promise<TicketInfo | null> {
    try {
      const baseUrl = await this.getUserServiceUrl();
      const response = await this.httpClient.getWithCircuitBreaker<any>(
        'user-service',
        `${baseUrl}/tickets/${ticketId}`,
        { headers: { Authorization: `Bearer ${authToken}` } },
        { fallbackValue: null },
      );

      if (!response) return null;

      return {
        id: response.id,
        subject: response.subject,
        status: response.status,
        priority: response.priority,
        createdAt: response.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get ticket info: ${error.message}`);
      return null;
    }
  }
}
