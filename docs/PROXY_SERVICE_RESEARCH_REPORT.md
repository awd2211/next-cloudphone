# 海外验证码接收平台调研报告

> **调研目的**: 为云手机平台集成验证码接收服务，支持大批量APP注册验证码接收

**调研时间**: 2025-11-02
**适用场景**: 云手机批量接收短信验证码、APP注册自动化、测试验证码功能

---

## 一、市场概况

### 1.1 平台类型分类

验证码接收服务主要分为两大类：

**A. 虚拟号码接收平台（推荐用于云手机）**
- **特点**: 提供临时虚拟号码，专门用于接收验证码
- **优势**: 成本低、支持批量、API友好
- **代表平台**: SMS-Activate, 5sim, SMSPool, OnlineSIM

**B. 企业级通信API平台（适合发送验证码）**
- **特点**: 提供完整的通信基础设施，主要用于发送短信
- **优势**: 可靠性高、合规性强、SLA保障
- **代表平台**: Twilio, Vonage, Sinch, Plivo

> ⚠️ **关键区别**: 我们的需求是**接收**验证码，因此选择第一类平台更合适。

---

## 二、推荐平台详细分析

### 2.1 SMS-Activate ⭐⭐⭐⭐⭐

**官网**: https://sms-activate.io
**API文档**: https://sms-activate.io/api

#### 核心特性
```yaml
覆盖国家: 180+ 个国家
号码类型: 真实SIM卡号码（非VoIP）
支持服务: 5000+ 个应用/网站（WhatsApp, Telegram, Google, Facebook等）
API类型: RESTful API with JSON
认证方式: API Key
响应速度: 实时（通常10-60秒内收到验证码）
```

#### 定价结构
| 国家 | 基础价格/号码 | 示例服务 |
|------|--------------|----------|
| 俄罗斯 | $0.01+ | Gmail: $0.08 |
| 印度 | $0.05+ | WhatsApp: $0.12 |
| 美国 | $0.50+ | Google Voice: $3.00 |
| 英国 | $0.30+ | Telegram: $0.25 |
| 中国 | $0.15+ | 微信: $0.50 |

**充值方式**: 加密货币、信用卡、电子钱包（最低充值$1）

#### API示例
```javascript
// 1. 获取号码
GET https://api.sms-activate.io/stubs/handler_api.php?api_key=YOUR_API_KEY&action=getNumber&service=go&country=0

// 响应
{
  "activationId": "123456789",
  "phoneNumber": "+79123456789"
}

// 2. 获取验证码
GET https://api.sms-activate.io/stubs/handler_api.php?api_key=YOUR_API_KEY&action=getStatus&id=123456789

// 响应
{
  "status": "OK",
  "code": "123456"
}

// 3. 完成激活
GET https://api.sms-activate.io/stubs/handler_api.php?api_key=YOUR_API_KEY&action=setStatus&status=6&id=123456789
```

#### 优势
- ✅ 全球覆盖最广（180+国家）
- ✅ 服务支持最多（5000+应用）
- ✅ API文档完善，有多语言SDK
- ✅ 价格透明，按次计费
- ✅ 支持号码租赁（长期使用同一号码）

#### 劣势
- ❌ 高峰期某些国家号码可能缺货
- ❌ 部分热门服务（如Google Voice）价格较高
- ❌ 没有专门的企业支持计划

---

### 2.2 5sim ⭐⭐⭐⭐

**官网**: https://5sim.net
**API文档**: https://5sim.net/support/working-with-api

#### 核心特性
```yaml
覆盖国家: 180+ 个国家
号码类型: 真实SIM卡
支持服务: 1000+ 个应用
API类型: RESTful API
认证方式: JWT Bearer Token
最低价格: $0.016/号码
```

#### 定价对比
```
基础号码租用: $0.016 - $2.00/次
批量折扣: 充值$100+ 享受10%折扣
租赁号码: $1-5/天（可接收多个验证码）
```

#### API示例
```bash
# 认证
Authorization: Bearer YOUR_API_TOKEN

# 1. 查询可用国家和服务
GET https://5sim.net/v1/guest/products/{country}/{operator}

# 2. 购买号码
GET https://5sim.net/v1/user/buy/activation/{country}/{operator}/{product}

# 响应
{
  "id": 123456789,
  "phone": "79123456789",
  "product": "google",
  "price": 0.50,
  "expires": "2025-11-02T12:00:00Z"
}

# 3. 检查短信
GET https://5sim.net/v1/user/check/123456789

# 响应
{
  "id": 123456789,
  "status": "RECEIVED",
  "sms": [{
    "code": "123456",
    "date": "2025-11-02T11:55:00Z"
  }]
}
```

#### 优势
- ✅ 价格相对较低
- ✅ API设计现代化（JWT认证）
- ✅ 支持号码租赁（5-30分钟内接收多条短信）
- ✅ 提供Python客户端库

#### 劣势
- ❌ 服务支持种类少于SMS-Activate
- ❌ 文档相对简单
- ❌ 号码可用性波动较大

---

### 2.3 SMSPool ⭐⭐⭐⭐

**官网**: https://www.smspool.net
**API文档**: https://www.smspool.net/article/how-to-use-the-smspool-api-0dd6eadf4c

#### 核心特性
```yaml
覆盖国家: 150+ 个国家
号码类型: Non-VoIP真实SIM卡
支持服务: 500+ 个应用
API兼容: SMS-Activate API格式（易于迁移）
特色: 支持高风险平台（Google Voice, PayPal等）
```

#### 定价
```
美国号码: $0.50 - $5.00/次（取决于服务）
欧洲号码: $0.30 - $2.00/次
亚洲号码: $0.20 - $1.50/次
高风险服务（Google Voice）: $3+ 使用物理SIM卡
```

#### API示例
```javascript
// 兼容SMS-Activate API格式
const apiKey = 'YOUR_API_KEY';

// 1. 获取余额
fetch(`https://api.smspool.net/request/balance?key=${apiKey}`)

// 2. 购买号码
fetch(`https://api.smspool.net/purchase/sms?key=${apiKey}&country=US&service=google`)

// 3. 检查验证码
fetch(`https://api.smspool.net/sms/check?key=${apiKey}&orderid=123456`)
```

#### 优势
- ✅ 支持高风险平台（使用物理SIM卡）
- ✅ API兼容SMS-Activate（迁移成本低）
- ✅ 提供专门的企业API定制

#### 劣势
- ❌ 价格较高
- ❌ 服务支持种类较少

---

### 2.4 OnlineSIM / GrizzlySMS ⭐⭐⭐

**OnlineSIM**: https://onlinesim.io
**GrizzlySMS**: https://grizzlysms.com

#### 核心特性
```yaml
覆盖国家: 100+ 个国家
号码类型: 真实SIM卡
支持服务: 1000+ 个应用
特色: 提供实体SIM卡邮寄服务
```

#### 定价
```
虚拟号码: $0.05 - $2.00/次
实体SIM卡租赁: $5 - $50/月（可接收无限短信）
```

#### 优势
- ✅ 可提供实体SIM卡（适合长期项目）
- ✅ 支持自定义转发规则

#### 劣势
- ❌ API稳定性不如SMS-Activate
- ❌ 响应速度较慢

---

## 三、企业级通信API（参考）

### 3.1 Twilio
- **用途**: 发送验证码，不适合接收
- **定价**: $0.0079/条（美国）
- **优势**: 全球最可靠的通信API
- **劣势**: 成本高，不支持虚拟号码接收

### 3.2 Vonage (Nexmo)
- **用途**: 双向SMS，但主要用于发送
- **定价**: $0.0067/条（美国）
- **优势**: 覆盖200+国家
- **劣势**: 接收短信功能有限

---

## 四、推荐方案

### 4.1 最佳方案: SMS-Activate + 5sim 双平台集成

**理由**:
1. **SMS-Activate作为主要平台**
   - 服务支持最全（5000+应用）
   - 全球覆盖最广
   - API最成熟

2. **5sim作为备用平台**
   - 价格更优惠
   - 分散风险，避免单点故障
   - 当SMS-Activate号码缺货时切换

### 4.2 集成架构设计

```
┌─────────────────────────────────────────────────────────┐
│              云手机平台 (Cloud Phone Platform)            │
│  ┌──────────────────────────────────────────────────┐   │
│  │       SMS接收服务 (SMS Receive Service)          │   │
│  │                                                  │   │
│  │  ┌────────────────┐      ┌────────────────┐     │   │
│  │  │ SMS-Activate   │      │    5sim        │     │   │
│  │  │   Adapter      │      │   Adapter      │     │   │
│  │  └────────┬───────┘      └────────┬───────┘     │   │
│  │           │                       │             │   │
│  │           └───────────┬───────────┘             │   │
│  │                       │                         │   │
│  │           ┌───────────▼───────────┐             │   │
│  │           │  统一API Gateway       │             │   │
│  │           └───────────┬───────────┘             │   │
│  │                       │                         │   │
│  │           ┌───────────▼───────────┐             │   │
│  │           │  号码管理 & 缓存      │             │   │
│  │           │  (Redis)              │             │   │
│  │           └───────────┬───────────┘             │   │
│  │                       │                         │   │
│  │           ┌───────────▼───────────┐             │   │
│  │           │  验证码分发队列       │             │   │
│  │           │  (RabbitMQ)           │             │   │
│  │           └───────────────────────┘             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Device Service (云手机实例)               │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐         │   │
│  │  │设备1 │  │设备2 │  │设备3 │  │设备N │         │   │
│  │  └──────┘  └──────┘  └──────┘  └──────┘         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 4.3 核心功能模块

#### A. SMS接收服务 (新增微服务)

**技术栈**: NestJS + TypeScript + Redis + RabbitMQ

**核心功能**:
```typescript
// backend/sms-receive-service/src/providers/

1. 多平台适配器
   - sms-activate.adapter.ts
   - fivesim.adapter.ts
   - base.adapter.ts (抽象基类)

2. 号码管理
   - 号码池管理（预购买、缓存、回收）
   - 号码分配策略（轮询、最少使用、成本优先）
   - 号码状态追踪

3. 验证码接收
   - 轮询检查（智能间隔：初始1秒，最多60秒）
   - WebHook回调（部分平台支持）
   - 超时处理（默认10分钟）

4. 费用管理
   - 余额监控
   - 自动充值
   - 成本统计
```

#### B. 数据库设计

```sql
-- 号码池表
CREATE TABLE virtual_numbers (
  id UUID PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,  -- sms-activate, 5sim
  phone_number VARCHAR(20) NOT NULL,
  country_code VARCHAR(5),
  service VARCHAR(100),  -- google, whatsapp, telegram
  activation_id VARCHAR(100) UNIQUE,
  status VARCHAR(20),  -- active, waiting_sms, completed, cancelled
  cost DECIMAL(10, 4),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  device_id UUID REFERENCES devices(id),
  UNIQUE(provider, activation_id)
);

-- 验证码记录表
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY,
  virtual_number_id UUID REFERENCES virtual_numbers(id),
  code VARCHAR(20),
  message_text TEXT,
  received_at TIMESTAMP DEFAULT NOW(),
  delivered_to_device BOOLEAN DEFAULT FALSE
);

-- 平台配置表
CREATE TABLE provider_configs (
  id UUID PRIMARY KEY,
  provider VARCHAR(50) UNIQUE,
  api_key VARCHAR(255) ENCRYPTED,
  api_endpoint VARCHAR(255),
  balance DECIMAL(10, 2),
  priority INT DEFAULT 1,  -- 1=主要, 2=备用
  enabled BOOLEAN DEFAULT TRUE,
  rate_limit INT,  -- 每分钟请求数
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 成本统计表
CREATE TABLE sms_usage_stats (
  id UUID PRIMARY KEY,
  provider VARCHAR(50),
  country VARCHAR(5),
  service VARCHAR(100),
  total_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  total_cost DECIMAL(10, 2),
  date DATE,
  UNIQUE(provider, country, service, date)
);
```

#### C. API设计

```typescript
// backend/sms-receive-service/src/api/

// 1. 获取验证码号码
POST /api/sms/request-number
{
  "service": "google",       // 必需: 服务名称
  "country": "US",           // 可选: 国家代码，默认任意
  "deviceId": "uuid",        // 必需: 云手机设备ID
  "provider": "sms-activate" // 可选: 指定平台，默认自动选择
}

// 响应
{
  "success": true,
  "data": {
    "virtualNumberId": "uuid",
    "phoneNumber": "+1234567890",
    "provider": "sms-activate",
    "cost": 0.50,
    "expiresAt": "2025-11-02T12:00:00Z"
  }
}

// 2. 检查验证码状态
GET /api/sms/:virtualNumberId/status

// 响应
{
  "success": true,
  "data": {
    "status": "RECEIVED",
    "code": "123456",
    "message": "Your verification code is 123456",
    "receivedAt": "2025-11-02T11:55:00Z"
  }
}

// 3. 取消号码（未收到验证码时退款）
POST /api/sms/:virtualNumberId/cancel

// 4. 批量请求号码（用于批量注册）
POST /api/sms/batch-request
{
  "service": "telegram",
  "country": "US",
  "count": 100,
  "deviceIds": ["uuid1", "uuid2", ...]
}

// 5. 获取余额和统计
GET /api/sms/balance
GET /api/sms/statistics?start=2025-11-01&end=2025-11-02
```

---

## 五、实施计划

### 5.1 Phase 1: 基础集成 (1-2周)

**目标**: 实现单平台SMS-Activate集成

**任务**:
```bash
1. 创建 backend/sms-receive-service 微服务
2. 实现 SMS-Activate Adapter
3. 实现基础API（request-number, check-status, cancel）
4. 数据库设计和迁移
5. Redis缓存集成（号码池缓存）
6. 基础测试
```

**可交付**:
- [ ] 单个云手机设备可以请求虚拟号码
- [ ] 可以接收验证码并返回给设备
- [ ] 支持取消和退款

### 5.2 Phase 2: 多平台支持 (1周)

**任务**:
```bash
1. 实现 5sim Adapter
2. 实现平台自动切换逻辑
3. 实现负载均衡策略
4. 添加成本优化算法
```

**可交付**:
- [ ] 支持SMS-Activate和5sim双平台
- [ ] 自动在平台间切换
- [ ] 成本报表

### 5.3 Phase 3: 高级功能 (1-2周)

**任务**:
```bash
1. 号码池预热（预购买常用国家号码）
2. 智能轮询优化（减少API调用）
3. WebHook回调支持
4. 批量操作API
5. 监控和告警（余额不足、成功率下降）
```

**可交付**:
- [ ] 响应速度提升50%
- [ ] API调用成本降低30%
- [ ] 完整的监控面板

### 5.4 Phase 4: 云手机集成 (1周)

**任务**:
```bash
1. Device Service调用SMS接收服务
2. 前端UI集成（用户可选择是否使用虚拟号码）
3. 自动化测试脚本
4. 文档编写
```

**可交付**:
- [ ] 用户可以在前端选择"使用虚拟号码"
- [ ] 验证码自动填入应用
- [ ] 完整的用户文档

---

## 六、成本估算

### 6.1 平台使用成本

**假设场景**: 每天1000个设备注册不同应用

| 应用类型 | 每次成本 | 日均次数 | 月成本 |
|---------|---------|---------|--------|
| Telegram | $0.10 | 300 | $900 |
| WhatsApp | $0.12 | 200 | $720 |
| Gmail | $0.08 | 200 | $480 |
| Facebook | $0.15 | 100 | $450 |
| Twitter | $0.20 | 100 | $600 |
| Instagram | $0.18 | 100 | $540 |
| **总计** | - | **1000** | **$3,690/月** |

**优化后成本**:
- 使用号码租赁: 节省20-30%
- 选择低价国家: 节省30-40%
- 批量折扣: 节省10-15%

**预计实际成本**: $2,000 - $2,500/月

### 6.2 开发和运维成本

| 项目 | 成本 |
|------|------|
| 开发成本（4-5周） | 1名后端工程师 |
| 服务器成本 | 最小化（共享现有基础设施） |
| API调用成本 | 包含在使用成本中 |
| 监控告警 | 使用现有Prometheus/Grafana |

---

## 七、风险和注意事项

### 7.1 合规性风险

⚠️ **重要警告**:

1. **使用场景限制**
   - ✅ 合法用途: 软件测试、开发调试、自动化测试
   - ❌ 禁止用途: 垃圾信息、欺诈、违反平台服务条款

2. **平台政策**
   - 某些应用（如银行、金融APP）可能检测虚拟号码
   - WhatsApp、Telegram等可能封禁使用虚拟号码注册的账号

3. **数据隐私**
   - 虚拟号码提供商可能记录所有短信内容
   - 不建议用于敏感信息接收

### 7.2 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 平台API不稳定 | 服务中断 | 多平台冗余、重试机制 |
| 号码缺货 | 无法获取号码 | 预购买号码池、多国家备选 |
| 验证码延迟 | 用户体验差 | 智能轮询、WebHook |
| 成本超支 | 预算压力 | 成本监控、自动限流 |
| 平台封禁 | 账号失效 | 多账号策略、IP轮换 |

### 7.3 业务风险

1. **成功率波动**
   - 某些服务在特定时间段号码缺货
   - 建议: 非高峰时段批量注册

2. **价格波动**
   - 热门服务价格可能上涨
   - 建议: 监控价格趋势，提前采购

3. **平台倒闭风险**
   - 接码平台可能关闭
   - 建议: 至少集成2个平台

---

## 八、推荐实施方案

### 最终推荐:

**主平台**: SMS-Activate
**备用平台**: 5sim
**集成方式**: 统一API Gateway + 多适配器模式
**部署方式**: 独立微服务（sms-receive-service）

**理由**:
1. ✅ SMS-Activate覆盖面最广，适合绝大多数场景
2. ✅ 5sim成本更优，作为备选可降低整体成本
3. ✅ 微服务架构易于扩展和维护
4. ✅ 可随时添加新的接码平台

---

## 九、下一步行动

### 立即执行:
1. **注册测试账号**
   ```bash
   1. 访问 https://sms-activate.io 注册
   2. 访问 https://5sim.net 注册
   3. 各充值 $10 进行功能测试
   4. 测试5-10个常用服务（Telegram, WhatsApp, Google等）
   ```

2. **技术验证**
   ```bash
   1. 测试API调用（获取号码、接收验证码、取消）
   2. 测试不同国家和服务的可用性
   3. 测试响应速度和成功率
   4. 评估实际成本
   ```

3. **技术方案设计**
   ```bash
   1. 确认微服务架构
   2. 设计数据库Schema
   3. 设计API接口
   4. 编写技术方案文档
   ```

### 1周后:
- 完成Phase 1开发（SMS-Activate集成）
- 在1-2个测试设备上验证功能

### 1个月后:
- 完成所有Phase开发
- 全面测试和优化
- 正式上线

---

## 十、参考资源

### API文档
- SMS-Activate: https://sms-activate.io/api
- 5sim: https://5sim.net/support/working-with-api
- SMSPool: https://www.smspool.net/article/how-to-use-the-smspool-api-0dd6eadf4c

### 社区和支持
- SMS-Activate Telegram: @smsactivate_en
- 5sim Support: support@5sim.net
- Reddit: r/SMSActivation

### 替代方案（如果主流平台不可用）
- OnlineSIM.io
- GrizzlySMS.com
- SMS-Man.com
- GetSMSCode.com

---

## 附录: 快速开始代码示例

### SMS-Activate集成示例

```typescript
// backend/sms-receive-service/src/providers/sms-activate.adapter.ts

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SmsActivateAdapter {
  private readonly logger = new Logger(SmsActivateAdapter.name);
  private readonly baseUrl = 'https://api.sms-activate.io/stubs/handler_api.php';

  constructor(private readonly apiKey: string) {}

  /**
   * 获取虚拟号码
   * @param service 服务代码 (go=Google, tg=Telegram等)
   * @param country 国家代码 (0=俄罗斯, 1=乌克兰, 12=美国等)
   */
  async getNumber(service: string, country: number = 0) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          action: 'getNumber',
          service,
          country
        }
      });

      // 响应格式: ACCESS_NUMBER:123456789:79123456789
      const data = response.data.split(':');

      if (data[0] !== 'ACCESS_NUMBER') {
        throw new Error(`Failed to get number: ${response.data}`);
      }

      return {
        activationId: data[1],
        phoneNumber: `+${data[2]}`,
        cost: await this.getServicePrice(service, country)
      };
    } catch (error) {
      this.logger.error(`Failed to get number from SMS-Activate`, error);
      throw error;
    }
  }

  /**
   * 检查短信状态
   */
  async getStatus(activationId: string) {
    const response = await axios.get(this.baseUrl, {
      params: {
        api_key: this.apiKey,
        action: 'getStatus',
        id: activationId
      }
    });

    const data = response.data;

    // STATUS_WAIT_CODE - 等待验证码
    if (data === 'STATUS_WAIT_CODE') {
      return { status: 'waiting', code: null };
    }

    // STATUS_OK:123456 - 收到验证码
    if (data.startsWith('STATUS_OK:')) {
      const code = data.split(':')[1];
      return { status: 'received', code };
    }

    // STATUS_CANCEL - 已取消
    if (data === 'STATUS_CANCEL') {
      return { status: 'cancelled', code: null };
    }

    return { status: 'unknown', code: null };
  }

  /**
   * 设置激活状态
   * @param status 1=告知已发送短信, 3=请求新短信, 6=完成, 8=取消
   */
  async setStatus(activationId: string, status: number) {
    await axios.get(this.baseUrl, {
      params: {
        api_key: this.apiKey,
        action: 'setStatus',
        status,
        id: activationId
      }
    });
  }

  /**
   * 获取余额
   */
  async getBalance() {
    const response = await axios.get(this.baseUrl, {
      params: {
        api_key: this.apiKey,
        action: 'getBalance'
      }
    });

    // 响应格式: ACCESS_BALANCE:123.45
    return parseFloat(response.data.split(':')[1]);
  }

  /**
   * 获取服务价格
   */
  private async getServicePrice(service: string, country: number) {
    const response = await axios.get(this.baseUrl, {
      params: {
        api_key: this.apiKey,
        action: 'getPrices',
        service,
        country
      }
    });

    return response.data[country]?.[service]?.cost || 0;
  }
}
```

### 使用示例

```typescript
// backend/sms-receive-service/src/sms-receive.service.ts

@Injectable()
export class SmsReceiveService {
  constructor(
    private readonly smsActivate: SmsActivateAdapter,
    private readonly fiveSim: FiveSimAdapter,
    @InjectRepository(VirtualNumber)
    private readonly virtualNumberRepo: Repository<VirtualNumber>
  ) {}

  /**
   * 请求虚拟号码
   */
  async requestNumber(dto: RequestNumberDto) {
    const { service, country, deviceId, provider } = dto;

    // 选择平台（默认SMS-Activate，缺货时切换5sim）
    let adapter = this.smsActivate;
    let providerName = 'sms-activate';

    if (provider === '5sim') {
      adapter = this.fiveSim;
      providerName = '5sim';
    }

    try {
      // 获取号码
      const number = await adapter.getNumber(service, country);

      // 保存到数据库
      const virtualNumber = this.virtualNumberRepo.create({
        provider: providerName,
        phoneNumber: number.phoneNumber,
        activationId: number.activationId,
        service,
        country,
        cost: number.cost,
        status: 'waiting_sms',
        deviceId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10分钟后过期
      });

      await this.virtualNumberRepo.save(virtualNumber);

      // 启动轮询检查验证码
      this.startPolling(virtualNumber.id);

      return virtualNumber;
    } catch (error) {
      // 如果SMS-Activate失败，尝试5sim
      if (providerName === 'sms-activate') {
        this.logger.warn('SMS-Activate failed, trying 5sim...');
        return this.requestNumber({ ...dto, provider: '5sim' });
      }
      throw error;
    }
  }

  /**
   * 轮询检查验证码
   */
  private async startPolling(virtualNumberId: string) {
    const virtualNumber = await this.virtualNumberRepo.findOne(virtualNumberId);
    if (!virtualNumber) return;

    const adapter = this.getAdapter(virtualNumber.provider);
    let attempts = 0;
    const maxAttempts = 60; // 最多检查60次（约10分钟）

    const poll = async () => {
      if (attempts >= maxAttempts) {
        // 超时，取消号码
        await adapter.setStatus(virtualNumber.activationId, 8);
        virtualNumber.status = 'cancelled';
        await this.virtualNumberRepo.save(virtualNumber);
        return;
      }

      const status = await adapter.getStatus(virtualNumber.activationId);

      if (status.status === 'received') {
        // 收到验证码
        virtualNumber.status = 'completed';
        await this.virtualNumberRepo.save(virtualNumber);

        // 保存短信记录
        await this.saveSmsMessage(virtualNumber.id, status.code);

        // 通知设备（通过RabbitMQ）
        await this.notifyDevice(virtualNumber.deviceId, status.code);

        // 完成激活
        await adapter.setStatus(virtualNumber.activationId, 6);
        return;
      }

      // 继续轮询（指数退避）
      attempts++;
      const delay = Math.min(1000 * Math.pow(1.5, attempts), 60000);
      setTimeout(poll, delay);
    };

    poll();
  }

  private getAdapter(provider: string) {
    return provider === '5sim' ? this.fiveSim : this.smsActivate;
  }
}
```

---

**报告结束**

如有任何问题，请随时询问！
