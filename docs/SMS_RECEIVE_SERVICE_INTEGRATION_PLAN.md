# SMS验证码接收服务集成方案

> **基于**: PROXY_SERVICE_RESEARCH_REPORT.md 调研结果
> **目标**: 为云手机平台集成SMS-Activate和5sim验证码接收服务

---

## 一、技术架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (30000)                         │
│                   ┌──────────────────┐                         │
│                   │  /api/sms/*      │                         │
│                   └────────┬─────────┘                         │
└────────────────────────────┼──────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           SMS Receive Service (30007) - 新增微服务              │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Controller Layer                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │ Numbers    │  │ Messages   │  │ Providers  │         │  │
│  │  │ Controller │  │ Controller │  │ Controller │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────┼────────────────────────────────┐ │
│  │                   Service Layer                            │ │
│  │  ┌──────────────────────┴───────────────────────────┐     │ │
│  │  │         NumberManagementService                  │     │ │
│  │  │  - 号码请求与分配                                  │     │ │
│  │  │  - 号码池管理                                      │     │ │
│  │  │  - 平台选择策略                                    │     │ │
│  │  └──────────────┬──────────────────────────────────┘     │ │
│  │                  │                                         │ │
│  │  ┌──────────────┴──────────────────────────────────┐     │ │
│  │  │         MessagePollingService                    │     │ │
│  │  │  - 验证码轮询                                      │     │ │
│  │  │  - 智能重试                                        │     │ │
│  │  │  - WebHook处理                                    │     │ │
│  │  └──────────────┬──────────────────────────────────┘     │ │
│  └──────────────────┼───────────────────────────────────────┘ │
│                     │                                          │
│  ┌──────────────────┼───────────────────────────────────────┐ │
│  │              Provider Adapters                            │ │
│  │  ┌──────────────┴────────────┬───────────────────┐       │ │
│  │  │  SmsActivateAdapter       │  FiveSimAdapter   │       │ │
│  │  │  - getNumber()            │  - buyNumber()    │       │ │
│  │  │  - getStatus()            │  - checkSms()     │       │ │
│  │  │  - setStatus()            │  - finish()       │       │ │
│  │  │  - getBalance()           │  - getBalance()   │       │ │
│  │  └───────────────────────────┴───────────────────┘       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Data Layer                              │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │ │
│  │  │ PostgreSQL  │  │   Redis     │  │  RabbitMQ   │       │ │
│  │  │ - 号码记录   │  │ - 号码池     │  │ - 事件队列   │       │ │
│  │  │ - 短信记录   │  │ - 平台余额   │  │ - 通知队列   │       │ │
│  │  │ - 成本统计   │  │ - 限流计数   │  │             │       │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    Event Bus (RabbitMQ)
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
    Device Service   Billing Service   Notification Service
  (接收验证码事件)     (记录成本)         (发送告警)
```

### 1.2 技术栈

```yaml
框架: NestJS 10.x + TypeScript 5.x
数据库: PostgreSQL 14 (共享 cloudphone 数据库)
缓存: Redis 7
消息队列: RabbitMQ 3
HTTP客户端: axios + @nestjs/axios
共享模块: @cloudphone/shared (EventBus, Consul, Cache等)
测试: Jest + Supertest
文档: Swagger/OpenAPI
```

---

## 二、数据库设计

### 2.1 Schema定义

```sql
-- =============================================
-- 表1: 虚拟号码记录
-- =============================================
CREATE TABLE virtual_numbers (
  -- 基础信息
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,              -- sms-activate, 5sim
  provider_activation_id VARCHAR(100) NOT NULL, -- 平台返回的激活ID

  -- 号码信息
  phone_number VARCHAR(20) NOT NULL,          -- +79123456789
  country_code VARCHAR(5) NOT NULL,           -- RU, US, CN等
  country_name VARCHAR(100),                  -- Russia, United States等

  -- 服务信息
  service_code VARCHAR(50) NOT NULL,          -- go, tg, wa等（平台服务代码）
  service_name VARCHAR(100),                  -- Google, Telegram, WhatsApp等

  -- 状态管理
  status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- active: 号码激活
    -- waiting_sms: 等待短信
    -- received: 已收到验证码
    -- completed: 激活完成
    -- cancelled: 已取消
    -- expired: 已过期

  -- 成本信息
  cost DECIMAL(10, 4) NOT NULL,               -- 单位: USD
  currency VARCHAR(10) DEFAULT 'USD',

  -- 关联信息
  device_id UUID REFERENCES devices(id),      -- 关联的云手机设备
  user_id UUID,                                -- 关联的用户（冗余字段）

  -- 时间信息
  created_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,                      -- 号码激活时间
  sms_received_at TIMESTAMP,                   -- 收到短信时间
  completed_at TIMESTAMP,                      -- 完成时间
  expires_at TIMESTAMP,                        -- 过期时间（默认10分钟）

  -- 元数据
  metadata JSONB,                              -- 额外信息（平台原始响应等）

  -- 索引
  CONSTRAINT unique_provider_activation
    UNIQUE(provider, provider_activation_id),
  INDEX idx_status (status),
  INDEX idx_device_id (device_id),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_expires_at (expires_at)
);

-- =============================================
-- 表2: 短信消息记录
-- =============================================
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  virtual_number_id UUID NOT NULL REFERENCES virtual_numbers(id) ON DELETE CASCADE,

  -- 短信内容
  message_text TEXT,                           -- 完整短信内容
  verification_code VARCHAR(20),               -- 提取的验证码
  sender VARCHAR(50),                          -- 发送方（如果有）

  -- 状态
  delivered_to_device BOOLEAN DEFAULT FALSE,   -- 是否已推送给设备

  -- 时间
  received_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,

  -- 索引
  INDEX idx_virtual_number_id (virtual_number_id),
  INDEX idx_received_at (received_at DESC)
);

-- =============================================
-- 表3: 平台配置
-- =============================================
CREATE TABLE provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 平台信息
  provider VARCHAR(50) UNIQUE NOT NULL,        -- sms-activate, 5sim
  display_name VARCHAR(100),                   -- SMS-Activate, 5sim

  -- API配置
  api_endpoint VARCHAR(255) NOT NULL,
  api_key TEXT NOT NULL,                       -- 加密存储
  api_key_encrypted BOOLEAN DEFAULT TRUE,

  -- 余额信息
  balance DECIMAL(10, 2),                      -- 当前余额
  balance_threshold DECIMAL(10, 2) DEFAULT 10.00, -- 余额告警阈值
  last_balance_check TIMESTAMP,

  -- 优先级和限流
  priority INT DEFAULT 1,                      -- 1=主要, 2=备用, 3=禁用
  rate_limit_per_minute INT DEFAULT 60,        -- 每分钟最大请求数

  -- 状态
  enabled BOOLEAN DEFAULT TRUE,
  health_status VARCHAR(20) DEFAULT 'healthy', -- healthy, degraded, down
  last_health_check TIMESTAMP,

  -- 统计信息
  total_requests BIGINT DEFAULT 0,
  total_success BIGINT DEFAULT 0,
  total_failures BIGINT DEFAULT 0,

  -- 时间
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 元数据
  metadata JSONB
);

-- =============================================
-- 表4: 使用统计（按天汇总）
-- =============================================
CREATE TABLE sms_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 维度
  provider VARCHAR(50) NOT NULL,
  country_code VARCHAR(5),
  service_code VARCHAR(50),
  stat_date DATE NOT NULL,

  -- 统计数据
  total_requests INT DEFAULT 0,                -- 总请求数
  success_count INT DEFAULT 0,                 -- 成功次数
  failure_count INT DEFAULT 0,                 -- 失败次数
  cancel_count INT DEFAULT 0,                  -- 取消次数

  -- 成本统计
  total_cost DECIMAL(10, 2) DEFAULT 0.00,
  avg_cost DECIMAL(10, 4),
  min_cost DECIMAL(10, 4),
  max_cost DECIMAL(10, 4),

  -- 时间统计（秒）
  avg_sms_receive_time INT,                    -- 平均收到验证码时间

  -- 时间
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 唯一约束
  CONSTRAINT unique_daily_stats
    UNIQUE(provider, country_code, service_code, stat_date),

  -- 索引
  INDEX idx_stat_date (stat_date DESC),
  INDEX idx_provider_date (provider, stat_date)
);

-- =============================================
-- 表5: 号码池（预购买的号码缓存）
-- =============================================
CREATE TABLE number_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider VARCHAR(50) NOT NULL,
  provider_activation_id VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  country_code VARCHAR(5) NOT NULL,
  service_code VARCHAR(50) NOT NULL,

  cost DECIMAL(10, 4) NOT NULL,

  -- 状态
  status VARCHAR(20) DEFAULT 'available',      -- available, reserved, used
  reserved_by_device UUID,                     -- 预留给哪个设备
  reserved_at TIMESTAMP,

  -- 时间
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,

  -- 索引
  INDEX idx_status_service (status, service_code),
  INDEX idx_expires_at (expires_at)
);

-- =============================================
-- 表6: 平台服务映射（服务代码标准化）
-- =============================================
CREATE TABLE service_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 标准服务名
  service_name VARCHAR(100) UNIQUE NOT NULL,   -- google, telegram, whatsapp
  display_name VARCHAR(100),                   -- Google, Telegram, WhatsApp

  -- 平台特定代码
  sms_activate_code VARCHAR(50),               -- go, tg, wa
  fivesim_code VARCHAR(50),                    -- google, telegram, whatsapp

  -- 元数据
  category VARCHAR(50),                        -- social, email, messaging等
  logo_url VARCHAR(255),
  popular BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 初始化服务映射数据
-- =============================================
INSERT INTO service_mappings (service_name, display_name, sms_activate_code, fivesim_code, category, popular) VALUES
('google', 'Google', 'go', 'google', 'email', TRUE),
('telegram', 'Telegram', 'tg', 'telegram', 'messaging', TRUE),
('whatsapp', 'WhatsApp', 'wa', 'whatsapp', 'messaging', TRUE),
('facebook', 'Facebook', 'fb', 'facebook', 'social', TRUE),
('instagram', 'Instagram', 'ig', 'instagram', 'social', TRUE),
('twitter', 'Twitter', 'tw', 'twitter', 'social', TRUE),
('wechat', 'WeChat', 'wx', 'wechat', 'messaging', TRUE),
('line', 'LINE', 'li', 'line', 'messaging', FALSE),
('viber', 'Viber', 'vi', 'viber', 'messaging', FALSE),
('tiktok', 'TikTok', 'tk', 'tiktok', 'social', TRUE),
('discord', 'Discord', 'ds', 'discord', 'gaming', FALSE),
('uber', 'Uber', 'ub', 'uber', 'service', FALSE),
('airbnb', 'Airbnb', 'ab', 'airbnb', 'service', FALSE);

-- =============================================
-- 视图: 活跃号码统计
-- =============================================
CREATE VIEW active_numbers_summary AS
SELECT
  provider,
  country_code,
  service_code,
  COUNT(*) as total_count,
  SUM(CASE WHEN status = 'waiting_sms' THEN 1 ELSE 0 END) as waiting_count,
  SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as received_count,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  SUM(cost) as total_cost,
  AVG(EXTRACT(EPOCH FROM (sms_received_at - activated_at))) as avg_receive_time_seconds
FROM virtual_numbers
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY provider, country_code, service_code;

-- =============================================
-- 函数: 更新统计数据
-- =============================================
CREATE OR REPLACE FUNCTION update_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' OR NEW.status = 'cancelled' THEN
    INSERT INTO sms_usage_stats (
      provider, country_code, service_code, stat_date,
      total_requests,
      success_count,
      cancel_count,
      total_cost
    )
    VALUES (
      NEW.provider,
      NEW.country_code,
      NEW.service_code,
      CURRENT_DATE,
      1,
      CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
      NEW.cost
    )
    ON CONFLICT (provider, country_code, service_code, stat_date)
    DO UPDATE SET
      total_requests = sms_usage_stats.total_requests + 1,
      success_count = sms_usage_stats.success_count +
        CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
      cancel_count = sms_usage_stats.cancel_count +
        CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
      total_cost = sms_usage_stats.total_cost + NEW.cost,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_usage_stats
AFTER UPDATE OF status ON virtual_numbers
FOR EACH ROW
EXECUTE FUNCTION update_usage_stats();
```

---

## 三、API设计

### 3.1 RESTful API端点

#### 3.1.1 号码管理

```typescript
/**
 * 请求虚拟号码
 * POST /api/sms/numbers/request
 */
interface RequestNumberDto {
  service: string;           // 标准服务名: google, telegram, whatsapp
  country?: string;          // 国家代码: US, RU, CN等，默认任意
  deviceId: string;          // 云手机设备UUID
  provider?: string;         // 指定平台: sms-activate, 5sim，默认自动选择
  usePool?: boolean;         // 是否优先使用号码池，默认false
}

interface RequestNumberResponse {
  success: boolean;
  data: {
    id: string;              // 虚拟号码UUID
    phoneNumber: string;     // +79123456789
    provider: string;        // sms-activate
    service: string;
    country: string;
    cost: number;            // USD
    status: string;          // active
    expiresAt: string;       // ISO 8601
  };
  message?: string;
}

/**
 * 获取号码状态
 * GET /api/sms/numbers/:id
 */
interface GetNumberStatusResponse {
  success: boolean;
  data: {
    id: string;
    phoneNumber: string;
    status: string;          // waiting_sms, received, completed, cancelled
    verificationCode: string | null;
    message: string | null;
    receivedAt: string | null;
    expiresAt: string;
  };
}

/**
 * 取消号码（退款）
 * POST /api/sms/numbers/:id/cancel
 */
interface CancelNumberResponse {
  success: boolean;
  data: {
    id: string;
    refunded: boolean;
    refundAmount: number;
  };
  message: string;
}

/**
 * 批量请求号码
 * POST /api/sms/numbers/batch-request
 */
interface BatchRequestDto {
  service: string;
  country?: string;
  count: number;             // 最多100个
  deviceIds: string[];       // 设备ID列表
}

interface BatchRequestResponse {
  success: boolean;
  data: {
    total: number;
    successful: number;
    failed: number;
    numbers: Array<{
      deviceId: string;
      numberId: string | null;
      phoneNumber: string | null;
      error: string | null;
    }>;
  };
}

/**
 * 列出我的号码
 * GET /api/sms/numbers?deviceId=xxx&status=xxx&page=1&limit=20
 */
interface ListNumbersQuery {
  deviceId?: string;
  status?: string;
  service?: string;
  page?: number;
  limit?: number;
}
```

#### 3.1.2 短信管理

```typescript
/**
 * 获取短信列表
 * GET /api/sms/messages?numberId=xxx
 */
interface ListMessagesResponse {
  success: boolean;
  data: {
    messages: Array<{
      id: string;
      verificationCode: string;
      messageText: string;
      receivedAt: string;
      delivered: boolean;
    }>;
    total: number;
  };
}
```

#### 3.1.3 平台管理（管理员）

```typescript
/**
 * 获取所有平台配置
 * GET /api/sms/providers
 */
interface GetProvidersResponse {
  success: boolean;
  data: Array<{
    provider: string;
    displayName: string;
    enabled: boolean;
    balance: number;
    healthStatus: string;
    priority: number;
    stats: {
      totalRequests: number;
      successRate: number;
    };
  }>;
}

/**
 * 更新平台配置
 * PUT /api/sms/providers/:provider
 */
interface UpdateProviderDto {
  enabled?: boolean;
  priority?: number;
  apiKey?: string;
  balanceThreshold?: number;
}

/**
 * 手动检查余额
 * POST /api/sms/providers/:provider/check-balance
 */
interface CheckBalanceResponse {
  success: boolean;
  data: {
    provider: string;
    balance: number;
    updatedAt: string;
  };
}
```

#### 3.1.4 统计和报表

```typescript
/**
 * 获取使用统计
 * GET /api/sms/statistics?start=2025-11-01&end=2025-11-02
 */
interface GetStatisticsQuery {
  start: string;             // YYYY-MM-DD
  end: string;
  provider?: string;
  service?: string;
  country?: string;
}

interface GetStatisticsResponse {
  success: boolean;
  data: {
    summary: {
      totalRequests: number;
      successCount: number;
      failureCount: number;
      cancelCount: number;
      totalCost: number;
      avgCost: number;
      avgReceiveTime: number; // 秒
    };
    byProvider: Array<{
      provider: string;
      count: number;
      cost: number;
      successRate: number;
    }>;
    byService: Array<{
      service: string;
      count: number;
      cost: number;
    }>;
    byCountry: Array<{
      country: string;
      count: number;
      cost: number;
    }>;
    daily: Array<{
      date: string;
      count: number;
      cost: number;
    }>;
  };
}

/**
 * 导出统计报表
 * GET /api/sms/statistics/export?format=csv&start=xxx&end=xxx
 */
// 返回CSV或Excel文件
```

---

## 四、服务实现

### 4.1 核心服务类

#### 4.1.1 NumberManagementService

```typescript
// backend/sms-receive-service/src/services/number-management.service.ts

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualNumber, ProviderConfig } from '../entities';
import { SmsActivateAdapter } from '../providers/sms-activate.adapter';
import { FiveSimAdapter } from '../providers/fivesim.adapter';
import { EventBusService } from '@cloudphone/shared';
import { MessagePollingService } from './message-polling.service';

@Injectable()
export class NumberManagementService {
  private readonly logger = new Logger(NumberManagementService.name);

  constructor(
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(ProviderConfig)
    private readonly providerRepo: Repository<ProviderConfig>,
    private readonly smsActivate: SmsActivateAdapter,
    private readonly fiveSim: FiveSimAdapter,
    private readonly pollingService: MessagePollingService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * 请求虚拟号码
   */
  async requestNumber(dto: RequestNumberDto): Promise<VirtualNumber> {
    const { service, country, deviceId, provider, usePool } = dto;

    // 1. 如果使用号码池，先尝试从池中获取
    if (usePool) {
      const pooledNumber = await this.getFromPool(service, country);
      if (pooledNumber) {
        return await this.assignPooledNumber(pooledNumber, deviceId);
      }
    }

    // 2. 选择平台
    const selectedProvider = provider || await this.selectBestProvider();
    const adapter = this.getAdapter(selectedProvider);

    // 3. 获取服务代码映射
    const serviceCode = await this.getServiceCode(service, selectedProvider);
    const countryCode = await this.getCountryCode(country, selectedProvider);

    // 4. 调用平台API获取号码
    try {
      const result = await adapter.getNumber(serviceCode, countryCode);

      // 5. 保存到数据库
      const virtualNumber = this.numberRepo.create({
        provider: selectedProvider,
        providerActivationId: result.activationId,
        phoneNumber: result.phoneNumber,
        countryCode: country || result.country,
        countryName: this.getCountryName(country),
        serviceCode: serviceCode,
        serviceName: service,
        cost: result.cost,
        status: 'active',
        deviceId,
        activatedAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分钟
        metadata: { providerResponse: result.raw }
      });

      await this.numberRepo.save(virtualNumber);

      // 6. 启动轮询检查验证码
      this.pollingService.startPolling(virtualNumber.id);

      // 7. 发布事件
      await this.eventBus.publish('cloudphone.events', 'sms.number.requested', {
        numberId: virtualNumber.id,
        deviceId,
        service,
        provider: selectedProvider
      });

      this.logger.log(
        `Virtual number requested: ${virtualNumber.phoneNumber} for device ${deviceId}`
      );

      return virtualNumber;

    } catch (error) {
      this.logger.error(`Failed to request number from ${selectedProvider}`, error);

      // 如果主平台失败，尝试备用平台
      if (!provider && selectedProvider === 'sms-activate') {
        this.logger.warn('Retrying with 5sim...');
        return this.requestNumber({ ...dto, provider: '5sim' });
      }

      throw new BadRequestException(
        `Failed to request virtual number: ${error.message}`
      );
    }
  }

  /**
   * 获取号码状态
   */
  async getNumberStatus(numberId: string): Promise<VirtualNumber> {
    const number = await this.numberRepo.findOne({ where: { id: numberId } });
    if (!number) {
      throw new NotFoundException(`Virtual number ${numberId} not found`);
    }

    // 如果状态是waiting_sms，手动检查一次
    if (number.status === 'waiting_sms') {
      const adapter = this.getAdapter(number.provider);
      const status = await adapter.getStatus(number.providerActivationId);

      if (status.status === 'received') {
        number.status = 'received';
        number.smsReceivedAt = new Date();
        await this.numberRepo.save(number);

        // 保存短信内容到sms_messages表
        // ...
      }
    }

    return number;
  }

  /**
   * 取消号码
   */
  async cancelNumber(numberId: string): Promise<{ refunded: boolean; amount: number }> {
    const number = await this.numberRepo.findOne({ where: { id: numberId } });
    if (!number) {
      throw new NotFoundException(`Virtual number ${numberId} not found`);
    }

    // 只有active或waiting_sms状态才能取消
    if (!['active', 'waiting_sms'].includes(number.status)) {
      throw new BadRequestException(
        `Cannot cancel number in status: ${number.status}`
      );
    }

    const adapter = this.getAdapter(number.provider);

    try {
      // 调用平台API取消（8=取消）
      await adapter.setStatus(number.providerActivationId, 8);

      // 更新状态
      number.status = 'cancelled';
      number.completedAt = new Date();
      await this.numberRepo.save(number);

      // 停止轮询
      this.pollingService.stopPolling(numberId);

      // 发布事件
      await this.eventBus.publish('cloudphone.events', 'sms.number.cancelled', {
        numberId,
        deviceId: number.deviceId,
        refunded: true,
        amount: number.cost
      });

      return { refunded: true, amount: number.cost };

    } catch (error) {
      this.logger.error(`Failed to cancel number ${numberId}`, error);
      throw new BadRequestException(`Failed to cancel number: ${error.message}`);
    }
  }

  /**
   * 批量请求号码
   */
  async batchRequest(dto: BatchRequestDto): Promise<any> {
    const { service, country, count, deviceIds } = dto;

    if (count > 100) {
      throw new BadRequestException('Maximum batch size is 100');
    }

    if (deviceIds.length !== count) {
      throw new BadRequestException('deviceIds length must match count');
    }

    const results = [];

    for (let i = 0; i < count; i++) {
      try {
        const number = await this.requestNumber({
          service,
          country,
          deviceId: deviceIds[i]
        });

        results.push({
          deviceId: deviceIds[i],
          numberId: number.id,
          phoneNumber: number.phoneNumber,
          error: null
        });

        // 避免触发限流，每个请求间隔500ms
        await this.sleep(500);

      } catch (error) {
        results.push({
          deviceId: deviceIds[i],
          numberId: null,
          phoneNumber: null,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.numberId !== null).length;
    const failed = results.filter(r => r.numberId === null).length;

    return {
      total: count,
      successful,
      failed,
      numbers: results
    };
  }

  /**
   * 选择最佳平台（基于优先级、健康状态、余额）
   */
  private async selectBestProvider(): Promise<string> {
    const providers = await this.providerRepo.find({
      where: { enabled: true },
      order: { priority: 'ASC' }
    });

    for (const provider of providers) {
      // 检查余额是否充足
      if (provider.balance < provider.balanceThreshold) {
        this.logger.warn(`Provider ${provider.provider} balance too low: ${provider.balance}`);
        continue;
      }

      // 检查健康状态
      if (provider.healthStatus === 'down') {
        this.logger.warn(`Provider ${provider.provider} is down`);
        continue;
      }

      return provider.provider;
    }

    throw new BadRequestException('No available providers');
  }

  /**
   * 获取适配器实例
   */
  private getAdapter(provider: string) {
    switch (provider) {
      case 'sms-activate':
        return this.smsActivate;
      case '5sim':
        return this.fiveSim;
      default:
        throw new BadRequestException(`Unknown provider: ${provider}`);
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 其他辅助方法...
}
```

#### 4.1.2 MessagePollingService

```typescript
// backend/sms-receive-service/src/services/message-polling.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from '@typeorm';
import { VirtualNumber, SmsMessage } from '../entities';
import { EventBusService } from '@cloudphone/shared';

@Injectable()
export class MessagePollingService {
  private readonly logger = new Logger(MessagePollingService.name);
  private readonly pollingTasks = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(VirtualNumber)
    private readonly numberRepo: Repository<VirtualNumber>,
    @InjectRepository(SmsMessage)
    private readonly messageRepo: Repository<SmsMessage>,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * 启动轮询检查验证码
   */
  startPolling(numberId: string): void {
    // 避免重复轮询
    if (this.pollingTasks.has(numberId)) {
      this.logger.warn(`Polling already started for ${numberId}`);
      return;
    }

    this.logger.log(`Starting polling for virtual number ${numberId}`);

    let attempts = 0;
    const maxAttempts = 60; // 最多检查60次（约10分钟）

    const poll = async () => {
      try {
        const number = await this.numberRepo.findOne({ where: { id: numberId } });

        // 如果号码不存在或已完成，停止轮询
        if (!number || ['completed', 'cancelled', 'expired'].includes(number.status)) {
          this.stopPolling(numberId);
          return;
        }

        // 检查是否超时
        if (attempts >= maxAttempts || new Date() > number.expiresAt) {
          await this.handleTimeout(number);
          this.stopPolling(numberId);
          return;
        }

        // 调用平台API检查状态
        const adapter = this.getAdapter(number.provider);
        const status = await adapter.getStatus(number.providerActivationId);

        if (status.status === 'received') {
          // 收到验证码
          await this.handleSmsReceived(number, status.code, status.message);
          this.stopPolling(numberId);
          return;
        }

        // 继续轮询（指数退避）
        attempts++;
        const delay = this.calculateDelay(attempts);

        const timeout = setTimeout(poll, delay);
        this.pollingTasks.set(numberId, timeout);

      } catch (error) {
        this.logger.error(`Polling error for ${numberId}`, error);

        // 错误时也继续重试，但增加延迟
        attempts++;
        if (attempts < maxAttempts) {
          const timeout = setTimeout(poll, 5000);
          this.pollingTasks.set(numberId, timeout);
        } else {
          this.stopPolling(numberId);
        }
      }
    };

    // 首次立即执行
    poll();
  }

  /**
   * 停止轮询
   */
  stopPolling(numberId: string): void {
    const timeout = this.pollingTasks.get(numberId);
    if (timeout) {
      clearTimeout(timeout);
      this.pollingTasks.delete(numberId);
      this.logger.log(`Stopped polling for ${numberId}`);
    }
  }

  /**
   * 处理收到短信
   */
  private async handleSmsReceived(
    number: VirtualNumber,
    code: string,
    messageText: string
  ): Promise<void> {
    this.logger.log(`SMS received for ${number.phoneNumber}: ${code}`);

    // 1. 更新虚拟号码状态
    number.status = 'received';
    number.smsReceivedAt = new Date();
    await this.numberRepo.save(number);

    // 2. 保存短信记录
    const message = this.messageRepo.create({
      virtualNumberId: number.id,
      verificationCode: code,
      messageText,
      receivedAt: new Date()
    });
    await this.messageRepo.save(message);

    // 3. 通知设备（通过RabbitMQ）
    await this.eventBus.publish('cloudphone.events', 'sms.code.received', {
      numberId: number.id,
      deviceId: number.deviceId,
      phoneNumber: number.phoneNumber,
      verificationCode: code,
      messageText,
      service: number.serviceName
    });

    // 4. 调用平台API确认完成（6=完成）
    const adapter = this.getAdapter(number.provider);
    await adapter.setStatus(number.providerActivationId, 6);

    number.status = 'completed';
    number.completedAt = new Date();
    await this.numberRepo.save(number);
  }

  /**
   * 处理超时
   */
  private async handleTimeout(number: VirtualNumber): Promise<void> {
    this.logger.warn(`Number ${number.phoneNumber} timed out`);

    // 1. 取消号码（退款）
    const adapter = this.getAdapter(number.provider);
    try {
      await adapter.setStatus(number.providerActivationId, 8);
    } catch (error) {
      this.logger.error('Failed to cancel timed out number', error);
    }

    // 2. 更新状态
    number.status = 'expired';
    number.completedAt = new Date();
    await this.numberRepo.save(number);

    // 3. 发布事件
    await this.eventBus.publish('cloudphone.events', 'sms.number.expired', {
      numberId: number.id,
      deviceId: number.deviceId,
      phoneNumber: number.phoneNumber
    });
  }

  /**
   * 计算轮询延迟（指数退避）
   * 第1次: 1秒
   * 第2次: 1.5秒
   * 第3次: 2.25秒
   * ...
   * 最大: 60秒
   */
  private calculateDelay(attempts: number): number {
    const base = 1000; // 1秒
    const factor = 1.5;
    const max = 60000; // 60秒

    return Math.min(base * Math.pow(factor, attempts - 1), max);
  }

  private getAdapter(provider: string) {
    // 注入适配器...
  }
}
```

---

## 五、平台适配器实现

### 5.1 SMS-Activate适配器

参考之前调研报告中的代码示例，完整实现在:
```
backend/sms-receive-service/src/providers/sms-activate.adapter.ts
```

### 5.2 5sim适配器

```typescript
// backend/sms-receive-service/src/providers/fivesim.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FiveSimAdapter {
  private readonly logger = new Logger(FiveSimAdapter.name);
  private readonly baseUrl = 'https://5sim.net/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly apiToken: string
  ) {}

  async buyNumber(service: string, country: string) {
    const url = `${this.baseUrl}/user/buy/activation/${country}/any/${service}`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: `Bearer ${this.apiToken}` }
      })
    );

    return {
      activationId: response.data.id.toString(),
      phoneNumber: `+${response.data.phone}`,
      country: response.data.country,
      cost: response.data.price,
      raw: response.data
    };
  }

  async checkSms(activationId: string) {
    const url = `${this.baseUrl}/user/check/${activationId}`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: `Bearer ${this.apiToken}` }
      })
    );

    const data = response.data;

    if (data.status === 'RECEIVED' && data.sms && data.sms.length > 0) {
      return {
        status: 'received',
        code: data.sms[0].code,
        message: data.sms[0].text
      };
    }

    if (data.status === 'PENDING') {
      return { status: 'waiting', code: null };
    }

    return { status: 'unknown', code: null };
  }

  async finish(activationId: string) {
    const url = `${this.baseUrl}/user/finish/${activationId}`;
    await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: `Bearer ${this.apiToken}` }
      })
    );
  }

  async cancel(activationId: string) {
    const url = `${this.baseUrl}/user/cancel/${activationId}`;
    await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: `Bearer ${this.apiToken}` }
      })
    );
  }

  async getBalance() {
    const url = `${this.baseUrl}/user/profile`;
    const response = await firstValueFrom(
      this.httpService.get(url, {
        headers: { Authorization: `Bearer ${this.apiToken}` }
      })
    );
    return response.data.balance;
  }
}
```

---

## 六、与现有系统集成

### 6.1 Device Service集成

在Device Service中新增SMS接收功能：

```typescript
// backend/device-service/src/devices/devices.controller.ts

import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { SmsClientService } from '../sms-client/sms-client.service';

@Controller('devices/:id/sms')
export class DeviceSmsController {
  constructor(
    private readonly smsClient: SmsClientService
  ) {}

  /**
   * 为设备请求虚拟号码
   */
  @Post('request-number')
  async requestNumber(
    @Param('id') deviceId: string,
    @Body() dto: { service: string; country?: string }
  ) {
    return this.smsClient.requestNumber({
      service: dto.service,
      country: dto.country,
      deviceId
    });
  }

  /**
   * 检查验证码状态
   */
  @Get(':numberId/status')
  async checkStatus(
    @Param('id') deviceId: string,
    @Param('numberId') numberId: string
  ) {
    return this.smsClient.getNumberStatus(numberId);
  }
}
```

```typescript
// backend/device-service/src/sms-client/sms-client.service.ts

import { Injectable } from '@nestjs/common';
import { HttpClientService } from '@cloudphone/shared';

@Injectable()
export class SmsClientService {
  constructor(
    private readonly httpClient: HttpClientService
  ) {}

  async requestNumber(dto: any) {
    return this.httpClient.post('/api/sms/numbers/request', dto, {
      serviceName: 'sms-receive-service'
    });
  }

  async getNumberStatus(numberId: string) {
    return this.httpClient.get(`/api/sms/numbers/${numberId}`, {
      serviceName: 'sms-receive-service'
    });
  }

  async cancelNumber(numberId: string) {
    return this.httpClient.post(`/api/sms/numbers/${numberId}/cancel`, {}, {
      serviceName: 'sms-receive-service'
    });
  }
}
```

### 6.2 RabbitMQ事件消费

Device Service监听验证码接收事件：

```typescript
// backend/device-service/src/rabbitmq/consumers/sms-events.consumer.ts

import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';

@Injectable()
export class SmsEventsConsumer {
  private readonly logger = new Logger(SmsEventsConsumer.name);

  /**
   * 监听验证码接收事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'sms.code.received',
    queue: 'device-service.sms-code-received'
  })
  async handleCodeReceived(event: {
    numberId: string;
    deviceId: string;
    phoneNumber: string;
    verificationCode: string;
    messageText: string;
    service: string;
  }) {
    this.logger.log(`Verification code received for device ${event.deviceId}`);

    // TODO: 可以通过ADB自动填入验证码
    // 或通过WebSocket推送给前端让用户手动复制

    // 1. 通过WebSocket通知前端
    // this.websocketGateway.sendToDevice(event.deviceId, {
    //   type: 'SMS_CODE_RECEIVED',
    //   data: {
    //     code: event.verificationCode,
    //     service: event.service
    //   }
    // });

    // 2. 或者通过ADB自动输入（如果支持）
    // await this.adbService.inputText(event.deviceId, event.verificationCode);
  }

  /**
   * 监听号码过期事件
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'sms.number.expired',
    queue: 'device-service.sms-number-expired'
  })
  async handleNumberExpired(event: {
    numberId: string;
    deviceId: string;
    phoneNumber: string;
  }) {
    this.logger.warn(`Virtual number ${event.phoneNumber} expired for device ${event.deviceId}`);

    // 通知前端
    // this.websocketGateway.sendToDevice(event.deviceId, {
    //   type: 'SMS_NUMBER_EXPIRED',
    //   data: { phoneNumber: event.phoneNumber }
    // });
  }
}
```

### 6.3 Billing Service集成

记录SMS接收成本：

```typescript
// backend/billing-service/src/rabbitmq/consumers/sms-events.consumer.ts

import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class SmsBillingConsumer {
  private readonly logger = new Logger(SmsBillingConsumer.name);

  constructor(
    private readonly usageService: UsageService
  ) {}

  /**
   * 记录SMS使用成本
   */
  @RabbitSubscribe({
    exchange: 'cloudphone.events',
    routingKey: 'sms.number.requested',
    queue: 'billing-service.sms-usage'
  })
  async recordSmsUsage(event: {
    numberId: string;
    deviceId: string;
    service: string;
    provider: string;
    cost: number;
  }) {
    // 记录到计费系统
    await this.usageService.recordUsage({
      type: 'sms_verification',
      deviceId: event.deviceId,
      amount: event.cost,
      metadata: {
        service: event.service,
        provider: event.provider,
        numberId: event.numberId
      }
    });

    this.logger.log(`Recorded SMS cost: $${event.cost} for device ${event.deviceId}`);
  }
}
```

---

## 七、前端集成

### 7.1 Admin前端 - 平台管理页面

```tsx
// frontend/admin/src/pages/SMS/ProviderManagement.tsx

import React, { useState, useEffect } from 'react';
import { Card, Table, Switch, InputNumber, Button, message, Tag } from 'antd';
import { getSmsProviders, updateSmsProvider, checkBalance } from '@/services/sms';

export const SmsProviderManagement: React.FC = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await getSmsProviders();
      setProviders(data);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (provider: string, enabled: boolean) => {
    await updateSmsProvider(provider, { enabled });
    message.success('更新成功');
    loadProviders();
  };

  const handleCheckBalance = async (provider: string) => {
    const balance = await checkBalance(provider);
    message.success(`余额: $${balance.toFixed(2)}`);
    loadProviders();
  };

  const columns = [
    {
      title: '平台',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: '状态',
      dataIndex: 'healthStatus',
      key: 'healthStatus',
      render: (status: string) => (
        <Tag color={status === 'healthy' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: number) => `$${balance.toFixed(2)}`,
    },
    {
      title: '成功率',
      dataIndex: 'stats',
      key: 'successRate',
      render: (stats: any) => `${(stats.successRate * 100).toFixed(1)}%`,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean, record: any) => (
        <Switch
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record.provider, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button onClick={() => handleCheckBalance(record.provider)}>
          检查余额
        </Button>
      ),
    },
  ];

  return (
    <Card title="SMS平台管理">
      <Table
        columns={columns}
        dataSource={providers}
        loading={loading}
        rowKey="provider"
      />
    </Card>
  );
};
```

### 7.2 User前端 - 虚拟号码请求

```tsx
// frontend/user/src/pages/Devices/RequestVirtualNumber.tsx

import React, { useState } from 'react';
import { Modal, Form, Select, Button, message, Alert } from 'antd';
import { requestVirtualNumber, getNumberStatus } from '@/services/sms';

interface Props {
  visible: boolean;
  deviceId: string;
  onClose: () => void;
  onSuccess: (phoneNumber: string) => void;
}

export const RequestVirtualNumberModal: React.FC<Props> = ({
  visible,
  deviceId,
  onClose,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [number, setNumber] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  const handleRequest = async (values: any) => {
    setLoading(true);
    try {
      const result = await requestVirtualNumber({
        service: values.service,
        country: values.country,
        deviceId
      });

      setNumber(result.data);
      message.success(`号码获取成功: ${result.data.phoneNumber}`);

      // 开始轮询检查验证码
      startPolling(result.data.id);

    } catch (error: any) {
      message.error(error.message || '获取号码失败');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (numberId: string) => {
    setChecking(true);

    const poll = async () => {
      try {
        const status = await getNumberStatus(numberId);

        if (status.data.status === 'received') {
          setChecking(false);
          message.success(`验证码: ${status.data.verificationCode}`);
          onSuccess(status.data.verificationCode);
          return;
        }

        if (status.data.status === 'expired') {
          setChecking(false);
          message.error('号码已过期，请重新获取');
          return;
        }

        // 继续轮询
        setTimeout(poll, 3000);

      } catch (error) {
        setChecking(false);
        message.error('检查验证码失败');
      }
    };

    poll();
  };

  return (
    <Modal
      title="请求虚拟号码"
      visible={visible}
      onCancel={onClose}
      footer={null}
    >
      {!number ? (
        <Form form={form} onFinish={handleRequest}>
          <Form.Item
            name="service"
            label="服务"
            rules={[{ required: true }]}
          >
            <Select placeholder="选择服务">
              <Select.Option value="google">Google</Select.Option>
              <Select.Option value="telegram">Telegram</Select.Option>
              <Select.Option value="whatsapp">WhatsApp</Select.Option>
              <Select.Option value="facebook">Facebook</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="country" label="国家">
            <Select placeholder="任意国家">
              <Select.Option value="US">美国</Select.Option>
              <Select.Option value="RU">俄罗斯</Select.Option>
              <Select.Option value="CN">中国</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              获取号码
            </Button>
          </Form.Item>
        </Form>
      ) : (
        <div>
          <Alert
            message="号码已获取"
            description={
              <div>
                <p>电话号码: <strong>{number.phoneNumber}</strong></p>
                <p>服务: {number.service}</p>
                <p>过期时间: {new Date(number.expiresAt).toLocaleString()}</p>
              </div>
            }
            type="success"
          />

          {checking && (
            <Alert
              message="正在等待验证码..."
              description="请在应用中输入此号码，系统会自动接收验证码"
              type="info"
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      )}
    </Modal>
  );
};
```

---

## 八、部署和监控

### 8.1 PM2配置

```javascript
// ecosystem.config.js (更新)

module.exports = {
  apps: [
    // ... 现有服务 ...

    // 新增 SMS接收服务
    {
      name: 'sms-receive-service',
      script: 'backend/sms-receive-service/dist/main.js',
      instances: 1,  // 单实例（内存中维护轮询状态）
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 30007
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 30007
      }
    }
  ]
};
```

### 8.2 Prometheus指标

```typescript
// backend/sms-receive-service/src/metrics/metrics.service.ts

import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  // 号码请求总数
  private readonly numberRequestsTotal = new Counter({
    name: 'sms_number_requests_total',
    help: 'Total number of virtual number requests',
    labelNames: ['provider', 'service', 'status']
  });

  // 验证码接收时长
  private readonly smsReceiveTime = new Histogram({
    name: 'sms_receive_duration_seconds',
    help: 'Time to receive SMS verification code',
    labelNames: ['provider', 'service'],
    buckets: [1, 5, 10, 30, 60, 120, 300]
  });

  // 当前活跃号码数
  private readonly activeNumbers = new Gauge({
    name: 'sms_active_numbers',
    help: 'Number of currently active virtual numbers',
    labelNames: ['provider']
  });

  // 平台余额
  private readonly providerBalance = new Gauge({
    name: 'sms_provider_balance_usd',
    help: 'SMS provider account balance in USD',
    labelNames: ['provider']
  });

  recordRequest(provider: string, service: string, status: string) {
    this.numberRequestsTotal.inc({ provider, service, status });
  }

  recordReceiveTime(provider: string, service: string, seconds: number) {
    this.smsReceiveTime.observe({ provider, service }, seconds);
  }

  updateActiveNumbers(provider: string, count: number) {
    this.activeNumbers.set({ provider }, count);
  }

  updateBalance(provider: string, balance: number) {
    this.providerBalance.set({ provider }, balance);
  }
}
```

### 8.3 告警规则

```yaml
# infrastructure/monitoring/prometheus/alerts/sms-alerts.yml

groups:
  - name: sms_receive_service
    interval: 30s
    rules:
      # 余额告警
      - alert: SmsProviderLowBalance
        expr: sms_provider_balance_usd < 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "SMS平台余额不足"
          description: "{{ $labels.provider }} 余额低于 $10"

      # 成功率告警
      - alert: SmsLowSuccessRate
        expr: |
          (
            rate(sms_number_requests_total{status="completed"}[5m])
            /
            rate(sms_number_requests_total[5m])
          ) < 0.7
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "SMS成功率过低"
          description: "{{ $labels.provider }} 成功率低于70%"

      # 接收时间告警
      - alert: SmsSlowReceiveTime
        expr: |
          histogram_quantile(0.95,
            rate(sms_receive_duration_seconds_bucket[5m])
          ) > 120
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "验证码接收过慢"
          description: "95%的验证码接收时间超过2分钟"
```

---

## 九、测试计划

### 9.1 单元测试

```typescript
// backend/sms-receive-service/src/services/__tests__/number-management.service.spec.ts

describe('NumberManagementService', () => {
  let service: NumberManagementService;
  let mockSmsActivate: jest.Mocked<SmsActivateAdapter>;

  beforeEach(() => {
    // 测试setup...
  });

  it('should request virtual number successfully', async () => {
    const dto = {
      service: 'google',
      deviceId: 'device-123'
    };

    mockSmsActivate.getNumber.mockResolvedValue({
      activationId: '123456',
      phoneNumber: '+79123456789',
      cost: 0.50
    });

    const result = await service.requestNumber(dto);

    expect(result.phoneNumber).toBe('+79123456789');
    expect(result.status).toBe('active');
  });

  it('should fallback to 5sim when sms-activate fails', async () => {
    mockSmsActivate.getNumber.mockRejectedValue(new Error('No numbers available'));
    mockFiveSim.buyNumber.mockResolvedValue({
      activationId: '789',
      phoneNumber: '+1234567890',
      cost: 0.60
    });

    const result = await service.requestNumber({ service: 'google', deviceId: 'device-123' });

    expect(result.provider).toBe('5sim');
    expect(result.phoneNumber).toBe('+1234567890');
  });
});
```

### 9.2 集成测试

```bash
# backend/sms-receive-service/test-integration.sh

#!/bin/bash

echo "=== SMS Receive Service Integration Test ==="

# 1. 请求虚拟号码
echo "1. Requesting virtual number..."
RESPONSE=$(curl -s -X POST http://localhost:30007/api/sms/numbers/request \
  -H "Content-Type: application/json" \
  -d '{
    "service": "telegram",
    "deviceId": "test-device-001"
  }')

NUMBER_ID=$(echo $RESPONSE | jq -r '.data.id')
PHONE_NUMBER=$(echo $RESPONSE | jq -r '.data.phoneNumber')

echo "Got number: $PHONE_NUMBER (ID: $NUMBER_ID)"

# 2. 等待30秒
echo "2. Waiting 30 seconds for SMS..."
sleep 30

# 3. 检查状态
echo "3. Checking status..."
STATUS=$(curl -s http://localhost:30007/api/sms/numbers/$NUMBER_ID)
echo $STATUS | jq '.'

CODE=$(echo $STATUS | jq -r '.data.verificationCode')

if [ "$CODE" != "null" ]; then
  echo "✅ SUCCESS: Verification code received: $CODE"
else
  echo "⏳ Still waiting for SMS..."
fi
```

---

## 十、总结

这份集成方案提供了：

1. **完整的技术架构** - 微服务设计，易于扩展
2. **详细的数据库设计** - 支持多平台、统计、号码池
3. **RESTful API** - 清晰的接口定义
4. **核心服务实现** - NumberManagement + MessagePolling
5. **多平台适配器** - SMS-Activate + 5sim
6. **系统集成** - Device/Billing/Notification Service
7. **前端集成** - Admin和User界面
8. **监控和告警** - Prometheus指标和告警规则
9. **测试覆盖** - 单元测试和集成测试

**下一步行动**:
1. 注册SMS-Activate和5sim测试账号
2. 测试API调用（充值$10测试）
3. 创建sms-receive-service微服务
4. 实现数据库Schema
5. 实现核心服务和适配器
6. 集成到现有系统
7. 编写测试
8. 部署和监控

预计完成时间: **4-5周**
