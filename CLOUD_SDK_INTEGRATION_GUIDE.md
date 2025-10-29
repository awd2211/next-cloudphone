# 云服务商 SDK 集成指南

**目标**: 集成华为云 CPH 和阿里云 ECP 的真实 SDK，替换当前的 Mock 实现

**当前状态**: ✅ Mock 实现完成，可正常运行
**集成状态**: ⏳ 待集成真实 SDK（需要云账号和 API 密钥）

---

## 📋 总览

| 云服务商 | SDK 包 | 文件位置 | TODO 数量 | 状态 |
|---------|--------|----------|----------|------|
| 华为云 CPH | @huaweicloud/huaweicloud-sdk-cph | [huawei-cph.client.ts](backend/device-service/src/providers/huawei/huawei-cph.client.ts) | 8 | ⏳ Mock |
| 阿里云 ECP | @alicloud/ecp20220517 | [aliyun-ecp.client.ts](backend/device-service/src/providers/aliyun/aliyun-ecp.client.ts) | 8 | ⏳ Mock |

---

## 🔥 华为云 CPH SDK 集成

### 1. 准备工作

#### 1.1 注册华为云账号

1. 访问 [华为云官网](https://www.huaweicloud.com/)
2. 注册并完成实名认证
3. 开通云手机 CPH 服务

#### 1.2 获取 API 凭证

1. 进入控制台 → 我的凭证
2. 创建访问密钥（Access Key）
3. 记录：
   - Access Key ID (AK)
   - Secret Access Key (SK)
   - Project ID
   - Region (例如: cn-north-4)

#### 1.3 安装 SDK

```bash
cd backend/device-service
npm install @huaweicloud/huaweicloud-sdk-core @huaweicloud/huaweicloud-sdk-cph
```

---

### 2. SDK 集成步骤

#### 2.1 更新环境变量

编辑 `backend/device-service/.env`:

```env
# 华为云 CPH 配置
HUAWEI_PROJECT_ID=your_project_id
HUAWEI_ACCESS_KEY_ID=your_access_key_id
HUAWEI_SECRET_ACCESS_KEY=your_secret_access_key
HUAWEI_REGION=cn-north-4
HUAWEI_ENDPOINT=https://cph.cn-north-4.myhuaweicloud.com
HUAWEI_DEFAULT_SERVER_ID=your_server_id
HUAWEI_DEFAULT_IMAGE_ID=your_image_id
```

#### 2.2 导入华为云 SDK

在 `huawei-cph.client.ts` 顶部添加：

```typescript
import { CphClient } from '@huaweicloud/huaweicloud-sdk-cph/v1/CphClient';
import { GlobalCredentials } from '@huaweicloud/huaweicloud-sdk-core/auth/GlobalCredentials';
import { CphRegion } from '@huaweicloud/huaweicloud-sdk-cph/v1/region/CphRegion';
import {
  CreateCloudPhoneServerRequest,
  CreateCloudPhoneServerRequestBody,
  ShowCloudPhoneDetailRequest,
  StartCloudPhoneRequest,
  StopCloudPhoneRequest,
  RebootCloudPhoneRequest,
  DeleteCloudPhoneRequest,
} from '@huaweicloud/huaweicloud-sdk-cph/v1/model';
```

#### 2.3 初始化客户端

在 `constructor` 中初始化：

```typescript
constructor(private configService: ConfigService) {
  this.config = {
    projectId: this.configService.get("HUAWEI_PROJECT_ID", ""),
    accessKeyId: this.configService.get("HUAWEI_ACCESS_KEY_ID", ""),
    secretAccessKey: this.configService.get("HUAWEI_SECRET_ACCESS_KEY", ""),
    region: this.configService.get("HUAWEI_REGION", "cn-north-4"),
    endpoint: this.configService.get(
      "HUAWEI_ENDPOINT",
      "https://cph.cn-north-4.myhuaweicloud.com",
    ),
    defaultServerId: this.configService.get("HUAWEI_DEFAULT_SERVER_ID", ""),
    defaultImageId: this.configService.get("HUAWEI_DEFAULT_IMAGE_ID", ""),
  };

  // 初始化华为云 SDK 客户端
  const credentials = new GlobalCredentials()
    .withAk(this.config.accessKeyId)
    .withSk(this.config.secretAccessKey)
    .withProjectId(this.config.projectId);

  this.client = CphClient.newBuilder()
    .withCredential(credentials)
    .withRegion(CphRegion.valueOf(this.config.region))
    .build();

  this.logger.log(
    `HuaweiCphClient initialized for region: ${this.config.region}`,
  );
}
```

#### 2.4 实现 API 方法

##### createPhone() - 创建云手机

**替换行 55-106**:

```typescript
async createPhone(
  request: CreateHuaweiPhoneRequest,
): Promise<HuaweiOperationResult<HuaweiPhoneInstance>> {
  try {
    this.logger.log(`Creating Huawei phone: ${request.phoneName}`);

    // 构建请求
    const sdkRequest = new CreateCloudPhoneServerRequest();
    const requestBody = new CreateCloudPhoneServerRequestBody();
    requestBody.withServerName(request.phoneName)
      .withServerModelName(request.specId)
      .withServerId(request.serverId)
      .withPhoneModelName(request.phoneModel || 'cloudphone.arm.2xlarge')
      .withImageId(this.config.defaultImageId)
      .withCount(1);

    sdkRequest.withBody(requestBody);

    // 调用华为云 API
    const response = await this.client.createCloudPhoneServer(sdkRequest);

    // 转换响应
    const jobs = response.jobs || [];
    if (jobs.length === 0) {
      throw new Error('No job returned from API');
    }

    const job = jobs[0];
    const instanceId = job.phone_id || `huawei-${Date.now()}`;

    const instance: HuaweiPhoneInstance = {
      instanceId,
      instanceName: request.phoneName,
      specId: request.specId,
      status: HuaweiPhoneStatus.CREATING,
      serverId: request.serverId,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      publicIp: '', // 将在实例运行后更新
      privateIp: '',
      property: request.property,
      jobId: job.job_id, // 保存 job ID 用于查询状态
    };

    this.logger.log(`Huawei phone created: ${instanceId}`);

    return {
      success: true,
      data: instance,
      requestId: response.request_id,
    };
  } catch (error) {
    this.logger.error(`Failed to create Huawei phone: ${error.message}`);
    return {
      success: false,
      errorCode: error.error_code || "CREATE_FAILED",
      errorMessage: error.error_msg || error.message,
    };
  }
}
```

##### getPhone() - 获取云手机详情

**替换行 111-149**:

```typescript
async getPhone(
  instanceId: string,
): Promise<HuaweiOperationResult<HuaweiPhoneInstance>> {
  try {
    const request = new ShowCloudPhoneDetailRequest();
    request.withPhoneId(instanceId);

    const response = await this.client.showCloudPhoneDetail(request);
    const phone = response.phone;

    if (!phone) {
      return {
        success: false,
        errorCode: "INSTANCE_NOT_FOUND",
        errorMessage: `Instance ${instanceId} not found`,
      };
    }

    const instance: HuaweiPhoneInstance = {
      instanceId: phone.phone_id,
      instanceName: phone.phone_name,
      specId: phone.phone_model_name,
      status: this.mapHuaweiStatus(phone.status),
      serverId: phone.server_id,
      createTime: phone.create_time,
      updateTime: phone.update_time,
      publicIp: phone.access_infos?.[0]?.intranet_ip || '',
      privateIp: phone.access_infos?.[0]?.internet_ip || '',
      property: phone.property,
    };

    return {
      success: true,
      data: instance,
      requestId: response.request_id,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: error.error_code || "GET_FAILED",
      errorMessage: error.error_msg || error.message,
    };
  }
}

// 辅助方法：映射华为云状态
private mapHuaweiStatus(status: number): HuaweiPhoneStatus {
  // 华为云状态码映射
  // 0: 创建中, 1: 运行中, 2: 关机, 3: 重启中, 4: 冻结, 5: 异常
  switch (status) {
    case 0:
      return HuaweiPhoneStatus.CREATING;
    case 1:
      return HuaweiPhoneStatus.RUNNING;
    case 2:
      return HuaweiPhoneStatus.STOPPED;
    case 3:
      return HuaweiPhoneStatus.REBOOTING;
    case 4:
      return HuaweiPhoneStatus.FROZEN;
    case 5:
      return HuaweiPhoneStatus.ERROR;
    default:
      return HuaweiPhoneStatus.UNKNOWN;
  }
}
```

##### startPhone() - 启动云手机

**替换行 154-194**:

```typescript
async startPhone(instanceId: string): Promise<HuaweiOperationResult<void>> {
  try {
    this.logger.log(`Starting Huawei phone: ${instanceId}`);

    const request = new StartCloudPhoneRequest();
    request.withBody({
      phones: [{ phone_id: instanceId }],
    });

    const response = await this.client.startCloudPhone(request);

    return {
      success: true,
      requestId: response.request_id,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: error.error_code || "START_FAILED",
      errorMessage: error.error_msg || error.message,
    };
  }
}
```

##### stopPhone() - 停止云手机

**替换行 199-239**:

```typescript
async stopPhone(instanceId: string): Promise<HuaweiOperationResult<void>> {
  try {
    this.logger.log(`Stopping Huawei phone: ${instanceId}`);

    const request = new StopCloudPhoneRequest();
    request.withBody({
      phones: [{ phone_id: instanceId }],
    });

    const response = await this.client.stopCloudPhone(request);

    return {
      success: true,
      requestId: response.request_id,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: error.error_code || "STOP_FAILED",
      errorMessage: error.error_msg || error.message,
    };
  }
}
```

##### rebootPhone() - 重启云手机

**替换行 244-283**:

```typescript
async rebootPhone(instanceId: string): Promise<HuaweiOperationResult<void>> {
  try {
    this.logger.log(`Rebooting Huawei phone: ${instanceId}`);

    const request = new RebootCloudPhoneRequest();
    request.withBody({
      phones: [{ phone_id: instanceId }],
    });

    const response = await this.client.rebootCloudPhone(request);

    return {
      success: true,
      requestId: response.request_id,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: error.error_code || "REBOOT_FAILED",
      errorMessage: error.error_msg || error.message,
    };
  }
}
```

##### deletePhone() - 删除云手机

**替换行 288-323**:

```typescript
async deletePhone(instanceId: string): Promise<HuaweiOperationResult<void>> {
  try {
    this.logger.log(`Deleting Huawei phone: ${instanceId}`);

    const request = new DeleteCloudPhoneRequest();
    request.withBody({
      phones: [{ phone_id: instanceId }],
    });

    const response = await this.client.deleteCloudPhone(request);

    return {
      success: true,
      requestId: response.request_id,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: error.error_code || "DELETE_FAILED",
      errorMessage: error.error_msg || error.message,
    };
  }
}
```

##### getConnectionInfo() - 获取连接信息

**替换行 328-385**:

```typescript
async getConnectionInfo(
  instanceId: string,
): Promise<HuaweiOperationResult<HuaweiConnectionInfo>> {
  try {
    // 华为云使用 GetConnectAppInfo 获取 WebRTC ticket
    const request = new GetConnectAppInfoRequest();
    request.withPhoneId(instanceId);

    const response = await this.client.getConnectAppInfo(request);

    const connectionInfo: HuaweiConnectionInfo = {
      instanceId,
      webrtc: {
        sessionId: response.session_id,
        ticket: response.ticket,
        signaling: response.signaling_url,
        stunServers: response.stun_servers || [
          `stun:stun.${this.config.region}.myhuaweicloud.com:3478`,
        ],
        turnServers: response.turn_servers?.map(server => ({
          urls: server.urls,
          username: server.username,
          credential: server.credential,
        })) || [],
      },
    };

    return {
      success: true,
      data: connectionInfo,
      requestId: response.request_id,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: error.error_code || "GET_CONNECTION_FAILED",
      errorMessage: error.error_msg || error.message,
    };
  }
}
```

---

### 3. 测试与验证

#### 3.1 单元测试

创建 `huawei-cph.client.spec.ts`:

```typescript
describe('HuaweiCphClient', () => {
  let client: HuaweiCphClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HuaweiCphClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => defaultValue),
          },
        },
      ],
    }).compile();

    client = module.get<HuaweiCphClient>(HuaweiCphClient);
  });

  it('should create phone', async () => {
    const result = await client.createPhone({
      phoneName: 'test-phone',
      specId: 'cloudphone.arm.2xlarge',
      serverId: 'server-123',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  // ... 更多测试
});
```

#### 3.2 集成测试

```bash
# 设置真实环境变量
export HUAWEI_PROJECT_ID=xxx
export HUAWEI_ACCESS_KEY_ID=xxx
export HUAWEI_SECRET_ACCESS_KEY=xxx

# 运行测试
npm run test:e2e huawei-cph
```

---

### 4. 参考文档

- [华为云 CPH API 文档](https://support.huaweicloud.com/api-cph/cph_02_0001.html)
- [华为云 SDK 参考](https://support.huaweicloud.com/sdkreference-cph/cph_04_0001.html)
- [华为云控制台](https://console.huaweicloud.com/cph/)

---

## 🔵 阿里云 ECP SDK 集成

### 1. 准备工作

#### 1.1 注册阿里云账号

1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 注册并完成实名认证
3. 开通弹性云手机 ECP 服务

#### 1.2 获取 API 凭证

1. 进入控制台 → AccessKey 管理
2. 创建 AccessKey
3. 记录：
   - AccessKey ID
   - AccessKey Secret
   - Region ID (例如: cn-hangzhou)

#### 1.3 安装 SDK

```bash
cd backend/device-service
npm install @alicloud/ecp20220517 @alicloud/openapi-client @alicloud/tea-util
```

---

### 2. SDK 集成步骤

#### 2.1 更新环境变量

编辑 `backend/device-service/.env`:

```env
# 阿里云 ECP 配置
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_REGION=cn-hangzhou
ALIYUN_ENDPOINT=ecp.cn-hangzhou.aliyuncs.com
ALIYUN_DEFAULT_IMAGE_ID=your_image_id
ALIYUN_DEFAULT_INSTANCE_TYPE=ecp.ce.large
```

#### 2.2 导入阿里云 SDK

在 `aliyun-ecp.client.ts` 顶部添加：

```typescript
import Ecp from '@alicloud/ecp20220517';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';
```

#### 2.3 初始化客户端

```typescript
constructor(private configService: ConfigService) {
  this.config = {
    accessKeyId: this.configService.get("ALIYUN_ACCESS_KEY_ID", ""),
    accessKeySecret: this.configService.get("ALIYUN_ACCESS_KEY_SECRET", ""),
    region: this.configService.get("ALIYUN_REGION", "cn-hangzhou"),
    endpoint: this.configService.get(
      "ALIYUN_ENDPOINT",
      "ecp.cn-hangzhou.aliyuncs.com",
    ),
    defaultImageId: this.configService.get("ALIYUN_DEFAULT_IMAGE_ID", ""),
    defaultInstanceType: this.configService.get(
      "ALIYUN_DEFAULT_INSTANCE_TYPE",
      "ecp.ce.large",
    ),
  };

  // 初始化阿里云 SDK 客户端
  const config = new $OpenApi.Config({
    accessKeyId: this.config.accessKeyId,
    accessKeySecret: this.config.accessKeySecret,
    regionId: this.config.region,
    endpoint: this.config.endpoint,
  });

  this.client = new Ecp(config);

  this.logger.log(
    `AliyunEcpClient initialized for region: ${this.config.region}`,
  );
}
```

#### 2.4 实现 API 方法

类似华为云的实现，阿里云 ECP 的 API 方法实现请参考：
- [阿里云 ECP API 文档](https://help.aliyun.com/document_detail/1010001.html)
- [Node.js SDK 示例](https://github.com/aliyun/alibabacloud-ecp-sdk)

---

### 3. 关键 API 映射

| 功能 | 阿里云 API | 华为云 API |
|------|-----------|-----------|
| 创建实例 | RunInstances | CreateCloudPhone |
| 查询详情 | DescribeInstances | ShowCloudPhoneDetail |
| 启动实例 | StartInstances | StartCloudPhone |
| 停止实例 | StopInstances | StopCloudPhone |
| 重启实例 | RebootInstances | RebootCloudPhone |
| 删除实例 | DeleteInstances | DeleteCloudPhone |
| 获取连接 | GetInstanceVncUrl | GetConnectAppInfo |

---

## 📊 集成清单

### 华为云 CPH (8 项)

| # | API 方法 | 行号 | SDK 方法 | 状态 |
|---|---------|------|---------|------|
| 1 | createPhone | 61 | CreateCloudPhoneServer | ⏳ 待集成 |
| 2 | getPhone | 125 | ShowCloudPhoneDetail | ⏳ 待集成 |
| 3 | startPhone | 168 | StartCloudPhone | ⏳ 待集成 |
| 4 | stopPhone | 213 | StopCloudPhone | ⏳ 待集成 |
| 5 | rebootPhone | 248 | RebootCloudPhone | ⏳ 待集成 |
| 6 | deletePhone | 292 | DeleteCloudPhone | ⏳ 待集成 |
| 7 | getConnectionInfo | 342 | GetConnectAppInfo | ⏳ 待集成 |
| 8 | 整体 SDK 集成 | 21 | - | ⏳ 待集成 |

### 阿里云 ECP (8 项)

| # | API 方法 | SDK 方法 | 状态 |
|---|---------|---------|------|
| 1 | createPhone | RunInstances | ⏳ 待集成 |
| 2 | getPhone | DescribeInstances | ⏳ 待集成 |
| 3 | startPhone | StartInstances | ⏳ 待集成 |
| 4 | stopPhone | StopInstances | ⏳ 待集成 |
| 5 | rebootPhone | RebootInstances | ⏳ 待集成 |
| 6 | deletePhone | DeleteInstances | ⏳ 待集成 |
| 7 | getConnectionInfo | GetInstanceVncUrl | ⏳ 待集成 |
| 8 | 整体 SDK 集成 | - | ⏳ 待集成 |

---

## ⚠️ 注意事项

### 1. API 配额限制

**华为云**:
- 默认每秒 8 请求
- 单账号最多 100 个云手机实例
- 建议使用 @RateLimit 装饰器控制请求频率

**阿里云**:
- 默认每秒 10 请求
- 单账号最多 50 个实例
- 需要申请扩容

### 2. 成本预算

**华为云 CPH 价格** (北京四区):
- 2核4G: ¥0.5/小时
- 4核8G: ¥1.0/小时
- 按需计费，停机仍收费

**阿里云 ECP 价格** (杭州):
- 基础型: ¥0.4/小时
- 标准型: ¥0.8/小时
- 按需计费，可购买预留实例

### 3. 开发建议

1. **优先使用 Mock 模式**
   - 本地开发使用 Mock
   - 生产环境切换为真实 SDK

2. **环境切换**
   ```typescript
   const USE_MOCK = process.env.NODE_ENV !== 'production';

   if (USE_MOCK) {
     // 使用 Mock 实现
     return mockCreatePhone(request);
   } else {
     // 使用真实 SDK
     return this.client.createCloudPhoneServer(request);
   }
   ```

3. **错误处理**
   - 所有 API 调用都使用 try-catch
   - 记录详细错误日志
   - 返回统一的错误格式

4. **重试机制**
   - 已有 @Retry 装饰器
   - 建议重试 3 次
   - 指数退避策略

---

## 🚀 快速开始

### 仅需 Mock 模式（推荐）

当前代码已经可以正常运行！Mock 实现提供了完整的功能模拟：

```bash
# 直接启动服务
pnpm dev

# 测试 API
curl -X POST http://localhost:30002/api/v1/devices \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "huawei",
    "name": "test-phone",
    "specId": "cloudphone.arm.2xlarge"
  }'
```

### 集成真实 SDK

仅在以下情况需要集成真实 SDK：
1. ✅ 生产环境部署
2. ✅ 需要真实云手机资源
3. ✅ 集成测试

步骤：
1. 注册云账号并获取 API 密钥
2. 安装对应的 SDK 包
3. 按照上述指南替换代码
4. 配置环境变量
5. 测试验证

---

## 📚 相关文档

- [华为云 CPH Client](backend/device-service/src/providers/huawei/huawei-cph.client.ts)
- [阿里云 ECP Client](backend/device-service/src/providers/aliyun/aliyun-ecp.client.ts)
- [Provider Types 定义](backend/device-service/src/providers/provider.types.ts)
- [华为云官方文档](https://support.huaweicloud.com/cph/index.html)
- [阿里云官方文档](https://help.aliyun.com/product/1010001.html)

---

**文档创建**: Claude Code
**最后更新**: 2025-10-29
**状态**: 集成指南完成 ✅
