# 华为云手机 (CPH) SDK 集成指南

## 📋 文档概述

**服务名称**: 华为云手机服务器 (Cloud Phone Host - CPH)
**文档版本**: v1.0
**更新日期**: 2025-11-24
**集成状态**: 🔧 准备中

---

## 🎯 产品定义

华为云手机服务器（CPH）是基于华为云鲲鹏裸金属服务器，在服务器上虚拟出N个带有原生安卓操作系统（AOSP）的云手机服务器。

### 核心特性

| 特性 | 说明 |
|------|------|
| **架构优势** | ARM 架构一致性，无指令集转换损耗 |
| **系统** | 原生 AOSP 系统 |
| **容器技术** | 自研 MonBox 容器技术 |
| **GPU 支持** | 集成高性价比专业 GPU 显卡 |
| **SDK 支持** | 提供视频、音频、触控 SDK |

### 应用场景

- ✅ APP 仿真测试
- ✅ 云游戏
- ✅ 移动办公
- ✅ 直播互娱

---

## 🔐 认证和鉴权

### Token 认证机制

华为云 CPH API 采用 **Token 认证**方式：

```typescript
// 1. 获取 Token
const getToken = async () => {
  const response = await fetch('https://iam.{region}.myhuaweicloud.com/v3/auth/tokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth: {
        identity: {
          methods: ['password'],
          password: {
            user: {
              name: 'username',
              password: 'password',
              domain: {
                name: 'domainname'
              }
            }
          }
        },
        scope: {
          project: {
            name: 'projectName' // 项目名称
          }
        }
      }
    })
  });

  // Token 在响应头 X-Subject-Token 中
  const token = response.headers.get('X-Subject-Token');
  return token;
};

// 2. 使用 Token 调用 API
const callAPI = async (token: string) => {
  const response = await fetch('https://{CPH Endpoint}/v1/{project_id}/...', {
    method: 'POST',
    headers: {
      'X-Auth-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // 请求参数
    })
  });

  return response.json();
};
```

### 权限要求

- IAM 用户需具备相应 API 调用权限
- 参考：[CPH 权限管理](https://support.huaweicloud.com/productdesc-cph/cph_prod_0008.html)

---

## 🚀 核心 API 接口

### 1. 云手机服务器管理

#### 开通/购买云手机服务器

```http
POST /v1/{project_id}/cloud-phone/servers
```

**说明**: 购买服务器后，系统会自动创建好云手机实例

#### 查询云手机服务器列表

```http
GET /v1/{project_id}/cloud-phone/servers?offset={offset}&limit={limit}
```

#### 查询云手机服务器规格列表

```http
GET /v1/{project_id}/cloud-phone/server-models
```

### 2. 云手机生命周期管理

#### 重启云手机

```http
POST /v1/{project_id}/cloud-phone/phones/batch-restart
```

**请求示例**:
```json
{
  "phone_ids": [
    "1234567b8bab40ffb711234cb80d0234",
    "1678567b8bab40f93711234cb80d0764"
  ]
}
```

**响应示例**:
```json
{
  "request_id": "6837531fd3f54550927b930180a706bf",
  "jobs": [
    {
      "phone_id": "1234567b8bab40ffb711234cb80d0234",
      "job_id": "2c9eb2c5544cbf6101544f0635672b60"
    }
  ]
}
```

**重要提示**:
- ❌ **不能使用 `adb reboot` 命令**重启云手机，可能导致故障
- ✅ 必须通过控制台或 API 进行重启
- ✅ 只支持"运行中"或"关机"状态的实例重启

#### 关闭云手机

```http
POST /v1/{project_id}/cloud-phone/phones/batch-shutdown
```

**请求示例**:
```json
{
  "phone_ids": ["phone_id_1", "phone_id_2"]
}
```

#### 开启云手机

```http
POST /v1/{project_id}/cloud-phone/phones/batch-start
```

#### 重置云手机

```http
POST /v1/{project_id}/cloud-phone/phones/batch-reset
```

**说明**:
- 重置后自动进入"运行中"状态
- 如重置前是"关机"状态，重置后会自动开机

### 3. 云手机查询

#### 查询云手机列表

```http
GET /v1/{project_id}/cloud-phone/phones?offset={offset}&limit={limit}&server_id={server_id}
```

**查询参数**:
- `offset`: 偏移量（分页）
- `limit`: 每页数量
- `server_id`: 服务器 ID（可选，按服务器过滤）

#### 查询云手机详情

```http
GET /v1/{project_id}/cloud-phone/phones/{phone_id}
```

**响应参数**: 参考[云手机属性列表](https://support.huaweicloud.com/api-cph/cph_api_appendix_03.html)

#### 查询云手机规格

```http
GET /v1/{project_id}/cloud-phone/phone-models
```

### 4. ADB 命令执行

#### 异步执行 ADB 命令

```http
POST /v1/{project_id}/cloud-phone/phones/commands
```

**请求示例 - 安装 APK**:
```json
{
  "command": "install",
  "content": "-t -r obs://push-bucket/my_apps/test.apk",
  "phone_ids": [
    "1234567b8bab40ffb711234cb80d0234"
  ]
}
```

**支持的命令类型**:
- `install`: 安装单个 APK
- `install-multiple`: 安装多个 APK（同一应用的拆分包）
- `uninstall`: 卸载应用
- `push-file`: 推送文件
- 自定义 adb 命令

**重要限制**:
- APK 文件大小限制: **2GB**
- 文件必须存储在华为云 OBS 桶中
- 接口为**异步执行**，需要轮询任务状态
- 批量执行可能阻塞其他任务（管理面性能有限）

#### 同步执行 ADB 命令

```http
POST /v1/{project_id}/cloud-phone/phones/commands/sync-run
```

**使用场景**: 需要立即获取命令执行结果的场景

### 5. 应用管理

#### 安装 APK

参考上面的 ADB 命令执行 - `install`

#### 卸载应用

```http
POST /v1/{project_id}/cloud-phone/phones/commands
```

```json
{
  "command": "uninstall",
  "content": "com.example.app",
  "phone_ids": ["phone_id"]
}
```

#### 推送文件

```http
POST /v1/{project_id}/cloud-phone/phones/commands
```

```json
{
  "command": "push-file",
  "content": "obs://bucket/file.txt /sdcard/",
  "phone_ids": ["phone_id"]
}
```

### 6. 云手机访问

#### 获取云手机访问信息

```http
GET /v1/{project_id}/cloud-phone/phones/{phone_id}/detail
```

**响应包含**:
- ADB 连接地址和端口
- VNC 连接信息
- 访问 Token

---

## 📡 连接方式

华为云手机支持多种连接方式：

### 1. ADB 连接

```bash
# 连接到云手机
adb connect {phone_ip}:{adb_port}

# 验证连接
adb devices

# 执行命令
adb shell
```

**连接信息获取**: 通过 API 获取云手机的 ADB 连接地址

### 2. SDK 连接

华为提供以下 SDK:
- 视频 SDK
- 音频 SDK
- 触控 SDK

### 3. 控制台管理

通过华为云控制台图形界面管理

---

## 🔧 集成到我们的平台

### 架构设计

```typescript
// backend/device-service/src/providers/huawei-cph/

huawei-cph/
├── huawei-cph.provider.ts       // 主提供者类
├── huawei-cph.types.ts          // 类型定义
├── huawei-cph.config.ts         // 配置管理
├── huawei-cph.auth.service.ts   // 认证服务
├── huawei-cph.api.client.ts     // API 客户端
└── dto/
    ├── create-phone.dto.ts
    ├── phone-action.dto.ts
    └── phone-query.dto.ts
```

### 核心接口实现

```typescript
// huawei-cph.provider.ts

import { Injectable, Logger } from '@nestjs/common';
import { HuaweiCPHAuthService } from './huawei-cph.auth.service';
import { HuaweiCPHApiClient } from './huawei-cph.api.client';

export interface HuaweiCPHConfig {
  region: string;           // 区域：cn-north-4 等
  projectId: string;        // 项目 ID
  endpoint: string;         // CPH Endpoint
  iamEndpoint: string;      // IAM Endpoint
  username: string;         // IAM 用户名
  password: string;         // IAM 密码
  domainName: string;       // 域名
}

export interface PhoneInstance {
  phoneId: string;
  phoneName: string;
  serverId: string;
  status: string;
  phoneModel: string;
  image: string;
  createTime: string;
  adbHost: string;
  adbPort: number;
}

@Injectable()
export class HuaweiCPHProvider {
  private readonly logger = new Logger(HuaweiCPHProvider.name);

  constructor(
    private readonly authService: HuaweiCPHAuthService,
    private readonly apiClient: HuaweiCPHApiClient,
  ) {}

  /**
   * 初始化提供者
   */
  async initialize(config: HuaweiCPHConfig): Promise<void> {
    this.logger.log('Initializing Huawei CPH Provider');
    await this.authService.authenticate(config);
  }

  /**
   * 查询云手机列表
   */
  async listPhones(serverId?: string): Promise<PhoneInstance[]> {
    const token = await this.authService.getToken();

    const response = await this.apiClient.get('/cloud-phone/phones', {
      headers: { 'X-Auth-Token': token },
      params: { server_id: serverId }
    });

    return response.phones.map(phone => ({
      phoneId: phone.phone_id,
      phoneName: phone.phone_name,
      serverId: phone.server_id,
      status: phone.status,
      phoneModel: phone.phone_model_name,
      image: phone.image_id,
      createTime: phone.create_time,
      adbHost: phone.access_infos?.adb?.listen_ip,
      adbPort: phone.access_infos?.adb?.listen_port,
    }));
  }

  /**
   * 获取云手机详情
   */
  async getPhone(phoneId: string): Promise<PhoneInstance> {
    const token = await this.authService.getToken();

    const response = await this.apiClient.get(
      `/cloud-phone/phones/${phoneId}`,
      { headers: { 'X-Auth-Token': token } }
    );

    return {
      phoneId: response.phone_id,
      phoneName: response.phone_name,
      serverId: response.server_id,
      status: response.status,
      phoneModel: response.phone_model_name,
      image: response.image_id,
      createTime: response.create_time,
      adbHost: response.access_infos?.adb?.listen_ip,
      adbPort: response.access_infos?.adb?.listen_port,
    };
  }

  /**
   * 重启云手机
   */
  async restartPhone(phoneIds: string[]): Promise<{
    requestId: string;
    jobs: Array<{ phoneId: string; jobId: string }>;
  }> {
    const token = await this.authService.getToken();

    const response = await this.apiClient.post(
      '/cloud-phone/phones/batch-restart',
      { phone_ids: phoneIds },
      { headers: { 'X-Auth-Token': token } }
    );

    return {
      requestId: response.request_id,
      jobs: response.jobs.map(job => ({
        phoneId: job.phone_id,
        jobId: job.job_id,
      })),
    };
  }

  /**
   * 关闭云手机
   */
  async shutdownPhone(phoneIds: string[]): Promise<void> {
    const token = await this.authService.getToken();

    await this.apiClient.post(
      '/cloud-phone/phones/batch-shutdown',
      { phone_ids: phoneIds },
      { headers: { 'X-Auth-Token': token } }
    );
  }

  /**
   * 开启云手机
   */
  async startPhone(phoneIds: string[]): Promise<void> {
    const token = await this.authService.getToken();

    await this.apiClient.post(
      '/cloud-phone/phones/batch-start',
      { phone_ids: phoneIds },
      { headers: { 'X-Auth-Token': token } }
    );
  }

  /**
   * 安装 APK
   */
  async installApk(phoneIds: string[], obsPath: string): Promise<{
    requestId: string;
    jobs: Array<{ phoneId: string; jobId: string }>;
  }> {
    const token = await this.authService.getToken();

    const response = await this.apiClient.post(
      '/cloud-phone/phones/commands',
      {
        command: 'install',
        content: `-t -r ${obsPath}`,
        phone_ids: phoneIds,
      },
      { headers: { 'X-Auth-Token': token } }
    );

    return {
      requestId: response.request_id,
      jobs: response.jobs.map(job => ({
        phoneId: job.phone_id,
        jobId: job.job_id,
      })),
    };
  }

  /**
   * 执行 ADB 命令
   */
  async executeAdbCommand(
    phoneIds: string[],
    command: string
  ): Promise<{
    requestId: string;
    jobs: Array<{ phoneId: string; jobId: string }>;
  }> {
    const token = await this.authService.getToken();

    const response = await this.apiClient.post(
      '/cloud-phone/phones/commands',
      {
        command: 'shell',
        content: command,
        phone_ids: phoneIds,
      },
      { headers: { 'X-Auth-Token': token } }
    );

    return {
      requestId: response.request_id,
      jobs: response.jobs.map(job => ({
        phoneId: job.phone_id,
        jobId: job.job_id,
      })),
    };
  }

  /**
   * 查询任务状态
   */
  async getJobStatus(jobId: string): Promise<{
    status: string;
    result?: any;
    error?: string;
  }> {
    const token = await this.authService.getToken();

    const response = await this.apiClient.get(
      `/cloud-phone/jobs/${jobId}`,
      { headers: { 'X-Auth-Token': token } }
    );

    return {
      status: response.status,
      result: response.entities,
      error: response.error_msg,
    };
  }
}
```

### 认证服务实现

```typescript
// huawei-cph.auth.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { HuaweiCPHConfig } from './huawei-cph.provider';

@Injectable()
export class HuaweiCPHAuthService {
  private readonly logger = new Logger(HuaweiCPHAuthService.name);
  private token: string | null = null;
  private tokenExpiry: Date | null = null;
  private config: HuaweiCPHConfig | null = null;

  constructor(private readonly httpService: HttpService) {}

  /**
   * 认证并获取 Token
   */
  async authenticate(config: HuaweiCPHConfig): Promise<string> {
    this.config = config;

    const response = await firstValueFrom(
      this.httpService.post(
        `${config.iamEndpoint}/v3/auth/tokens`,
        {
          auth: {
            identity: {
              methods: ['password'],
              password: {
                user: {
                  name: config.username,
                  password: config.password,
                  domain: {
                    name: config.domainName
                  }
                }
              }
            },
            scope: {
              project: {
                id: config.projectId
              }
            }
          }
        }
      )
    );

    // Token 在响应头中
    this.token = response.headers['x-subject-token'];

    // Token 有效期通常为 24 小时
    this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    this.logger.log('Successfully authenticated with Huawei Cloud IAM');
    return this.token;
  }

  /**
   * 获取有效 Token（自动刷新）
   */
  async getToken(): Promise<string> {
    // 检查 Token 是否过期
    if (!this.token || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
      if (!this.config) {
        throw new Error('Not authenticated. Call authenticate() first.');
      }
      await this.authenticate(this.config);
    }

    return this.token!;
  }

  /**
   * 清除 Token
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }
}
```

### API 客户端实现

```typescript
// huawei-cph.api.client.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ApiClientConfig {
  baseURL: string;
  projectId: string;
  timeout?: number;
}

@Injectable()
export class HuaweiCPHApiClient {
  private readonly logger = new Logger(HuaweiCPHApiClient.name);
  private config: ApiClientConfig | null = null;

  constructor(private readonly httpService: HttpService) {}

  setConfig(config: ApiClientConfig): void {
    this.config = config;
  }

  private getBaseURL(): string {
    if (!this.config) {
      throw new Error('API client not configured');
    }
    return `${this.config.baseURL}/v1/${this.config.projectId}`;
  }

  async get(path: string, options?: any): Promise<any> {
    const url = `${this.getBaseURL()}${path}`;
    this.logger.debug(`GET ${url}`);

    const response = await firstValueFrom(
      this.httpService.get(url, {
        ...options,
        timeout: options?.timeout || this.config?.timeout || 30000,
      })
    );

    return response.data;
  }

  async post(path: string, data: any, options?: any): Promise<any> {
    const url = `${this.getBaseURL()}${path}`;
    this.logger.debug(`POST ${url}`);

    const response = await firstValueFrom(
      this.httpService.post(url, data, {
        ...options,
        timeout: options?.timeout || this.config?.timeout || 30000,
      })
    );

    return response.data;
  }

  async put(path: string, data: any, options?: any): Promise<any> {
    const url = `${this.getBaseURL()}${path}`;
    this.logger.debug(`PUT ${url}`);

    const response = await firstValueFrom(
      this.httpService.put(url, data, {
        ...options,
        timeout: options?.timeout || this.config?.timeout || 30000,
      })
    );

    return response.data;
  }

  async delete(path: string, options?: any): Promise<any> {
    const url = `${this.getBaseURL()}${path}`;
    this.logger.debug(`DELETE ${url}`);

    const response = await firstValueFrom(
      this.httpService.delete(url, {
        ...options,
        timeout: options?.timeout || this.config?.timeout || 30000,
      })
    );

    return response.data;
  }
}
```

---

## 📊 云手机状态

云手机实例的生命周期状态：

| 状态 | 说明 | 可执行操作 |
|------|------|-----------|
| **创建中** | 正在创建实例 | 无 |
| **运行中** | 正常运行 | 关机、重启、重置、安装应用 |
| **关机** | 已关机 | 开机、重启 |
| **关机中** | 正在关机 | 无 |
| **开机中** | 正在开机 | 无 |
| **重启中** | 正在重启 | 无 |
| **重置中** | 正在重置 | 无 |
| **故障** | 实例故障 | 联系技术支持 |
| **删除中** | 正在删除 | 无 |

---

## ⚠️ 重要注意事项

### 1. ADB 命令限制

- ❌ **禁止使用 `adb reboot`**: 可能导致云手机故障
- ✅ **使用 API 重启**: 通过 `/batch-restart` 接口

### 2. 性能限制

- 管理面性能有限，批量 ADB 命令可能阻塞其他任务
- 建议合理控制并发请求数量

### 3. 文件上传限制

- APK 文件必须先上传到华为云 OBS 桶
- APK 大小限制: **2GB**
- 需要配置 OBS 桶委托授权

### 4. Token 管理

- Token 有效期通常为 24 小时
- 建议实现自动刷新机制
- Token 失效时需重新认证

### 5. 区域和网络

- 华为云手机服务器仅在特定区域可用
- 确保网络连通性
- 考虑跨区域数据传输成本

---

## 🔗 参考资源

### 官方文档

- [云手机服务器产品介绍](https://support.huaweicloud.com/productdesc-cph/cph_prod_0002.html)
- [云手机服务器 API 参考](https://support.huaweicloud.com/api-cph/)
- [SDK 参考文档](https://support.huaweicloud.com/sdkreference-cph/)
- [快速入门指南](https://support.huaweicloud.com/qs-cph/)
- [用户指南](https://support.huaweicloud.com/usermanual-cph/)
- [CPH 权限管理](https://support.huaweicloud.com/productdesc-cph/cph_prod_0008.html)
- [错误码参考](https://support.huaweicloud.com/api-cph/ErrorCode.html)

### 开发者资源

- [华为云开发者中心](https://developer.huaweicloud.cn/)
- [API Explorer](https://apiexplorer.developer.huaweicloud.com/)
- [SDK 下载](https://developer.huaweicloud.cn/tool.html)

---

## 📝 下一步计划

### Phase 1: 基础对接 (1-2 周)

- [ ] 实现认证服务 (`HuaweiCPHAuthService`)
- [ ] 实现 API 客户端 (`HuaweiCPHApiClient`)
- [ ] 实现核心提供者类 (`HuaweiCPHProvider`)
- [ ] 集成到 device-service 的提供者系统
- [ ] 单元测试和集成测试

### Phase 2: 功能完善 (2-3 周)

- [ ] 实现云手机列表查询
- [ ] 实现云手机生命周期管理（启动、停止、重启）
- [ ] 实现 APK 安装功能
- [ ] 实现 ADB 命令执行
- [ ] 任务状态轮询和监控

### Phase 3: 高级特性 (2-3 周)

- [ ] 云手机服务器管理
- [ ] 批量操作优化
- [ ] 错误处理和重试机制
- [ ] 性能监控和日志
- [ ] 文档完善

### Phase 4: 生产就绪 (1-2 周)

- [ ] 配置管理（多环境支持）
- [ ] 安全加固（密钥管理）
- [ ] 监控告警集成
- [ ] 压力测试
- [ ] 上线准备

---

**总预估时间**: 6-10 周

**优先级**: 🔥 高优先级

**负责人**: Device Service Team

---

*文档更新时间: 2025-11-24*
*下次审核: 实施 Phase 1 后*
