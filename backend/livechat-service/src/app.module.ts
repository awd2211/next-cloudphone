import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import {
  createLoggerConfig,
  ConsulModule,
  DistributedLockModule,
  AllExceptionsFilter,
  EventBusModule,
  RequestTracingMiddleware, // ✅ 分布式追踪中间件
} from '@cloudphone/shared';

// 功能模块
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { ChatModule } from './chat/chat.module';
import { AgentsModule } from './agents/agents.module';
import { QueuesModule } from './queues/queues.module';
import { AiModule } from './ai/ai.module';
import { MediaModule } from './media/media.module';
import { DeviceAssistModule } from './device-assist/device-assist.module';
import { TicketsModule } from './tickets/tickets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { QualityModule } from './quality/quality.module';
import { ArchivesModule } from './archives/archives.module';
import { EncryptionModule } from './encryption/encryption.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { BlacklistModule } from './blacklist/blacklist.module';
import { SupervisionModule } from './supervision/supervision.module';
import { SlaModule } from './sla/sla.module';
import { BotModule } from './bot/bot.module';
import { SurveyModule } from './survey/survey.module';
import { VisitorModule } from './visitor/visitor.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { TrainingModule } from './training/training.module';
import { ExportModule } from './export/export.module';

// 实体
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { Agent } from './entities/agent.entity';
import { AgentGroup } from './entities/agent-group.entity';
import { QueueConfig } from './entities/queue-config.entity';
import { QueueItem } from './entities/queue-item.entity';
import { CannedResponse } from './entities/canned-response.entity';
import { SatisfactionRating } from './entities/satisfaction-rating.entity';
import { QualityReview } from './entities/quality-review.entity';
import { SensitiveWord } from './entities/sensitive-word.entity';
import { MessageArchive } from './entities/message-archive.entity';
import { KnowledgeCategory } from './entities/knowledge-category.entity';
import { KnowledgeArticle } from './entities/knowledge-article.entity';
import { KnowledgeUsage } from './entities/knowledge-usage.entity';
import { Blacklist } from './entities/blacklist.entity';
import { SlaRule } from './entities/sla-rule.entity';
import { SlaAlert } from './entities/sla-alert.entity';
import { Bot } from './entities/bot.entity';
import { BotIntent } from './entities/bot-intent.entity';
import { BotConversation } from './entities/bot-conversation.entity';
import { SurveyTemplate } from './entities/survey-template.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { VisitorProfile } from './entities/visitor-profile.entity';
import { VisitorEvent } from './entities/visitor-event.entity';
import { ConversationCollaboration } from './entities/collaboration.entity';
import { InternalMessage } from './entities/internal-message.entity';
import { ShiftTemplate } from './entities/shift-template.entity';
import { AgentSchedule } from './entities/agent-schedule.entity';
import { RecurringSchedule } from './entities/recurring-schedule.entity';
import { TrainingCourse } from './entities/training-course.entity';
import { TrainingEnrollment } from './entities/training-enrollment.entity';
import { Exam, ExamAttempt } from './entities/exam.entity';
import { ExportTask } from './entities/export-task.entity';
import { EncryptionKey } from './entities/encryption-key.entity';
import { EncryptionAudit } from './entities/encryption-audit.entity';
import { TicketLink } from './entities/ticket-link.entity';
import { TicketTemplate } from './entities/ticket-template.entity';

// RabbitMQ 消费者
import { LivechatEventsConsumer } from './rabbitmq/consumers/livechat-events.consumer';
import { TicketEventsConsumer } from './rabbitmq/consumers/ticket-events.consumer';

// WebSocket 网关
import { ChatGateway } from './gateway/chat.gateway';

// 定时任务
import { TasksService } from './tasks/tasks.service';

// Guards
import { HttpThrottlerGuard } from './common/guards/http-throttler.guard';

// 配置验证
import { validate } from './common/config/env.validation';
import { getDatabaseConfig } from './common/config/database.config';

@Module({
  imports: [
    // ========== 全局配置 ==========
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),

    // ========== 日志模块 ==========
    LoggerModule.forRoot(createLoggerConfig('livechat-service')),

    // ========== Throttler 限流模块 ==========
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute (聊天服务需要更高限制)
      },
    ]),

    // ========== 数据库模块 ==========
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // ========== 注册实体 ==========
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      Agent,
      AgentGroup,
      QueueConfig,
      QueueItem,
      CannedResponse,
      SatisfactionRating,
      QualityReview,
      SensitiveWord,
      MessageArchive,
      KnowledgeCategory,
      KnowledgeArticle,
      KnowledgeUsage,
      Blacklist,
      SlaRule,
      SlaAlert,
      Bot,
      BotIntent,
      BotConversation,
      SurveyTemplate,
      SurveyResponse,
      VisitorProfile,
      VisitorEvent,
      ConversationCollaboration,
      InternalMessage,
      ShiftTemplate,
      AgentSchedule,
      RecurringSchedule,
      TrainingCourse,
      TrainingEnrollment,
      Exam,
      ExamAttempt,
      ExportTask,
      EncryptionKey,
      EncryptionAudit,
      TicketLink,
      TicketTemplate,
    ]),

    // ========== Redis 缓存 ==========
    CacheModule,

    // ========== Redis 直接连接 (用于实时状态) ==========
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('REDIS_HOST', 'localhost')}:${configService.get('REDIS_PORT', 6379)}`,
        options: {
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),

    // ========== 定时任务 ==========
    ScheduleModule.forRoot(),

    // ========== 事件发射器 ==========
    EventEmitterModule.forRoot(),

    // ========== RabbitMQ 消息队列 ==========
    EventBusModule.forRoot(),

    // ========== Consul 服务注册 ==========
    ConsulModule,

    // ========== 分布式锁 ==========
    DistributedLockModule.forRoot(),

    // ========== 功能模块 ==========
    AuthModule,
    ChatModule,
    AgentsModule,
    QueuesModule,
    AiModule,
    MediaModule,
    DeviceAssistModule,
    TicketsModule,
    AnalyticsModule,
    QualityModule,
    ArchivesModule,
    EncryptionModule,
    KnowledgeBaseModule,
    BlacklistModule,
    SupervisionModule,
    SlaModule,
    BotModule,
    SurveyModule,
    VisitorModule,
    CollaborationModule,
    SchedulingModule,
    TrainingModule,
    ExportModule,
  ],
  controllers: [HealthController],
  providers: [
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局 Throttler 守卫
    {
      provide: APP_GUARD,
      useClass: HttpThrottlerGuard,
    },
    // 定时任务
    TasksService,
    // WebSocket 网关
    ChatGateway,
    // RabbitMQ 消费者
    LivechatEventsConsumer,
    TicketEventsConsumer,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ✅ 分布式追踪中间件
    consumer.apply(RequestTracingMiddleware).forRoutes('*');
  }
}
