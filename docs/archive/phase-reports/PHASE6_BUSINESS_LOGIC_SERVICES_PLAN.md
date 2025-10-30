# Phase 6: 业务逻辑服务测试计划

**日期**: 2025-10-30
**阶段**: Phase 6 - 业务逻辑服务测试
**预估时间**: 6-8 小时
**目标服务数**: 6-8 个核心业务服务

---

## 📋 Phase 6 概览

Phase 6 专注于测试项目的**核心业务逻辑服务**，这些是用户直接使用的功能，对产品价值最直接。

### 阶段目标
- ✅ 为所有核心业务逻辑服务编写单元测试
- ✅ 确保 CRUD 操作、业务规则验证的正确性
- ✅ 验证权限控制和多租户隔离
- ✅ 测试覆盖率达到 95%+

---

## 🎯 服务优先级分级

### CRITICAL 优先级 (P0)

#### 1. UsersService
**文件**: `backend/user-service/src/users/users.service.ts`
**优先级**: ⚠️ CRITICAL
**功能**: 用户管理（CQRS + Event Sourcing）
**预估测试数**: 20-25
**关键测试场景**:
- 创建用户（发送 CreateUserCommand）
- 更新用户信息（发送 UpdateUserCommand）
- 删除用户（软删除）
- 查询用户（通过 QueryBus）
- 密码管理（ChangePasswordCommand）
- 用户状态管理（激活/禁用）
- 多租户隔离验证
- Event Sourcing 事件验证

#### 2. DevicesService
**文件**: `backend/device-service/src/devices/devices.service.ts`
**优先级**: ⚠️ CRITICAL
**功能**: 设备管理（核心业务）
**预估测试数**: 25-30
**关键测试场景**:
- 创建设备（容器创建、端口分配）
- 启动/停止设备
- 删除设备（清理资源）
- 设备状态查询
- 设备列表（分页、过滤）
- 配额检查（QuotaGuard）
- 设备快照管理
- 事件发布验证

#### 3. AuthService
**文件**: `backend/user-service/src/auth/auth.service.ts`
**优先级**: ⚠️ CRITICAL
**功能**: 认证授权（JWT, 登录/注册）
**预估测试数**: 18-22
**关键测试场景**:
- 用户注册（验证码、重复检查）
- 用户登录（JWT生成）
- Token刷新
- 密码验证
- 登录失败次数限制
- 验证码生成和验证
- 多租户登录隔离

---

### HIGH 优先级 (P1)

#### 4. AppsService
**文件**: `backend/app-service/src/apps/apps.service.ts`
**优先级**: 🔴 HIGH
**功能**: 应用管理（APK上传、安装）
**预估测试数**: 15-20
**关键测试场景**:
- APK上传（MinIO集成）
- APK下载
- 应用列表查询
- 应用安装（ADB集成）
- 应用卸载
- 应用版本管理
- 多租户应用隔离

#### 5. BillingService
**文件**: `backend/billing-service/src/billing/billing.service.ts`
**优先级**: 🔴 HIGH
**功能**: 计费管理（余额、订单）
**预估测试数**: 18-22
**关键测试场景**:
- 创建订单
- 余额扣除
- 充值
- 订单查询
- 计费规则计算
- Saga 补偿逻辑
- 事务一致性

---

### MEDIUM 优先级 (P2)

#### 6. NotificationsService
**文件**: `backend/notification-service/src/notifications/notifications.service.ts`
**优先级**: 🟡 MEDIUM
**功能**: 通知管理（发送、模板）
**预估测试数**: 12-15
**关键测试场景**:
- 发送通知（Email, SMS, WebSocket）
- 通知模板渲染
- 通知历史查询
- 批量通知
- 通知状态更新

#### 7. QuotasService
**文件**: `backend/user-service/src/quotas/quotas.service.ts`
**优先级**: 🟡 MEDIUM
**功能**: 配额管理
**预估测试数**: 12-15
**关键测试场景**:
- 配额查询
- 配额更新
- 配额检查
- 使用量上报
- 配额重置

---

### LOW 优先级 (P3) - 可选

#### 8. SnapshotsService
**文件**: `backend/device-service/src/snapshots/snapshots.service.ts`
**优先级**: 🟢 LOW
**功能**: 设备快照管理
**预估测试数**: 10-12

#### 9. AuditLogService
**文件**: `backend/user-service/src/common/services/audit-log.service.ts`
**优先级**: 🟢 LOW
**功能**: 审计日志
**预估测试数**: 8-10

---

## 📊 Phase 6 统计预估

### 数量预估
| 优先级 | 服务数 | 预估测试数 | 预估时间 |
|--------|--------|-----------|---------|
| CRITICAL | 3 | 63-77 | 3-4 小时 |
| HIGH | 2 | 33-42 | 2-3 小时 |
| MEDIUM | 2 | 24-30 | 1.5-2 小时 |
| LOW | 2 | 18-22 | 1 小时 |
| **总计** | **9** | **138-171** | **7.5-10 小时** |

### 保守估计（仅 P0 + P1）
- 服务数: 5
- 测试数: 96-119
- 预估时间: 5-7 小时

---

## 🔑 关键测试模式

### 1. CQRS + Event Sourcing 测试模式 (UsersService)

```typescript
describe('UsersService', () => {
  let service: UsersService;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let eventBus: EventBus;

  beforeEach(async () => {
    // Mock CommandBus, QueryBus, EventBus
    mockCommandBus = {
      execute: jest.fn(),
    };
    mockQueryBus = {
      execute: jest.fn(),
    };
    mockEventBus = {
      publish: jest.fn(),
    };
  });

  it('应该通过 CommandBus 创建用户', async () => {
    // Arrange
    const createUserDto = {
      username: 'john',
      email: 'john@example.com',
      password: 'password123',
    };

    mockCommandBus.execute.mockResolvedValue({
      id: 'user-123',
      ...createUserDto,
    });

    // Act
    const result = await service.create(createUserDto);

    // Assert
    expect(mockCommandBus.execute).toHaveBeenCalledWith(
      expect.any(CreateUserCommand),
    );
    expect(result.id).toBe('user-123');
  });

  it('应该通过 QueryBus 查询用户', async () => {
    // Arrange
    const userId = 'user-123';
    mockQueryBus.execute.mockResolvedValue({
      id: userId,
      username: 'john',
    });

    // Act
    const result = await service.findOne(userId);

    // Assert
    expect(mockQueryBus.execute).toHaveBeenCalledWith(
      expect.any(GetUserQuery),
    );
    expect(result.id).toBe(userId);
  });

  it('应该发布 UserCreatedEvent', async () => {
    // Arrange
    const createUserDto = { username: 'john', email: 'john@example.com' };
    const createdUser = { id: 'user-123', ...createUserDto };

    mockCommandBus.execute.mockResolvedValue(createdUser);

    // Act
    await service.create(createUserDto);

    // Assert
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        type: 'UserCreatedEvent',
      }),
    );
  });
});
```

### 2. 设备服务测试模式 (DevicesService)

```typescript
describe('DevicesService', () => {
  let service: DevicesService;
  let dockerService: DockerService;
  let adbService: AdbService;
  let quotaGuard: QuotaGuard;
  let eventBus: EventBusService;

  it('应该创建设备并分配端口', async () => {
    // Arrange
    const createDeviceDto = {
      name: 'test-device',
      userId: 'user-123',
      config: {
        cpuCores: 2,
        memoryMB: 4096,
      },
    };

    mockDockerService.createContainer.mockResolvedValue({
      id: 'container-123',
    });
    mockPortManager.allocatePort.mockResolvedValue(5555);

    // Act
    const device = await service.create(createDeviceDto);

    // Assert
    expect(device.containerId).toBe('container-123');
    expect(device.adbPort).toBe(5555);
    expect(mockDockerService.createContainer).toHaveBeenCalled();
  });

  it('应该在配额不足时抛出错误', async () => {
    // Arrange
    const createDeviceDto = { userId: 'user-123', name: 'device' };

    mockQuotaGuard.canProceed.mockReturnValue(false);

    // Act & Assert
    await expect(service.create(createDeviceDto)).rejects.toThrow(
      'Quota exceeded',
    );
  });

  it('应该发布 device.created 事件', async () => {
    // Arrange
    const device = { id: 'device-123', userId: 'user-123' };

    mockDockerService.createContainer.mockResolvedValue({
      id: 'container-123',
    });

    // Act
    await service.create({ userId: 'user-123', name: 'device' });

    // Assert
    expect(mockEventBus.publishDeviceEvent).toHaveBeenCalledWith(
      'created',
      expect.objectContaining({
        deviceId: expect.any(String),
        userId: 'user-123',
      }),
    );
  });
});
```

### 3. 认证服务测试模式 (AuthService)

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let captchaService: CaptchaService;

  it('应该成功登录并返回 JWT', async () => {
    // Arrange
    const loginDto = {
      username: 'john',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-123',
      username: 'john',
      passwordHash: await bcrypt.hash('password123', 10),
    };

    mockUsersService.findByUsername.mockResolvedValue(mockUser);
    mockJwtService.sign.mockReturnValue('jwt-token-123');

    // Act
    const result = await service.login(loginDto);

    // Assert
    expect(result.accessToken).toBe('jwt-token-123');
    expect(result.user.id).toBe('user-123');
  });

  it('应该在密码错误时抛出 UnauthorizedException', async () => {
    // Arrange
    const loginDto = {
      username: 'john',
      password: 'wrong-password',
    };

    const mockUser = {
      id: 'user-123',
      passwordHash: await bcrypt.hash('correct-password', 10),
    };

    mockUsersService.findByUsername.mockResolvedValue(mockUser);

    // Act & Assert
    await expect(service.login(loginDto)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('应该验证验证码', async () => {
    // Arrange
    const registerDto = {
      email: 'john@example.com',
      captcha: '123456',
    };

    mockCaptchaService.verify.mockResolvedValue(true);

    // Act
    const isValid = await service.verifyCaptcha(
      registerDto.email,
      registerDto.captcha,
    );

    // Assert
    expect(isValid).toBe(true);
    expect(mockCaptchaService.verify).toHaveBeenCalledWith(
      registerDto.email,
      '123456',
    );
  });
});
```

### 4. Saga 补偿测试模式 (BillingService)

```typescript
describe('BillingService Saga', () => {
  it('应该在支付失败时执行补偿', async () => {
    // Arrange
    const orderDto = {
      userId: 'user-123',
      amount: 100,
      planId: 'plan-456',
    };

    mockPaymentService.charge.mockRejectedValue(
      new Error('Payment failed'),
    );

    // Act & Assert
    await expect(service.createOrder(orderDto)).rejects.toThrow(
      'Payment failed',
    );

    // Verify compensation
    expect(mockBalanceService.refund).toHaveBeenCalledWith(
      'user-123',
      100,
    );
    expect(mockOrderRepository.updateStatus).toHaveBeenCalledWith(
      expect.any(String),
      'FAILED',
    );
  });
});
```

### 5. 多租户隔离测试模式

```typescript
describe('Multi-tenant isolation', () => {
  it('应该只返回当前租户的数据', async () => {
    // Arrange
    const tenantId = 'tenant-123';
    const userId = 'user-456';

    mockRepository.find.mockResolvedValue([
      { id: 'device-1', tenantId: 'tenant-123' },
      { id: 'device-2', tenantId: 'tenant-123' },
    ]);

    // Act
    const devices = await service.findAll(userId, { tenantId });

    // Assert
    expect(mockRepository.find).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-123',
        userId: 'user-456',
      },
    });
    expect(devices).toHaveLength(2);
    expect(devices.every((d) => d.tenantId === 'tenant-123')).toBe(true);
  });

  it('应该阻止跨租户访问', async () => {
    // Arrange
    const tenantId = 'tenant-123';
    const deviceId = 'device-from-other-tenant';

    mockRepository.findOne.mockResolvedValue({
      id: deviceId,
      tenantId: 'tenant-999', // Different tenant
    });

    // Act & Assert
    await expect(
      service.findOne(deviceId, { tenantId }),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

---

## 💡 关键测试要点

### 1. CRUD 操作测试
- ✅ Create: 数据验证、重复检查、事件发布
- ✅ Read: 查询单个、查询列表、分页、过滤、排序
- ✅ Update: 部分更新、全量更新、版本控制
- ✅ Delete: 软删除、硬删除、级联删除、权限检查

### 2. 业务规则验证
- ✅ 输入验证（DTO validation）
- ✅ 业务约束（唯一性、依赖关系）
- ✅ 状态机转换（设备状态：created→starting→running→stopped）
- ✅ 配额限制（设备数量、资源使用）

### 3. 权限和安全
- ✅ 多租户隔离（tenantId验证）
- ✅ 用户权限检查（RBAC）
- ✅ 资源所有权验证（userId匹配）
- ✅ 敏感操作审计（密码修改、删除）

### 4. 异步和事件
- ✅ 事件发布验证
- ✅ Saga 补偿逻辑
- ✅ 事务一致性
- ✅ 重试机制

### 5. 外部集成
- ✅ Docker API集成（容器管理）
- ✅ ADB集成（设备控制）
- ✅ MinIO集成（文件存储）
- ✅ Redis集成（缓存、锁）
- ✅ RabbitMQ集成（消息队列）

---

## 📝 实施计划

### 第一阶段：P0 服务（3-4 小时）
1. **UsersService** (20-25 tests)
   - CQRS命令/查询
   - Event Sourcing验证
   - 多租户隔离

2. **DevicesService** (25-30 tests)
   - 设备生命周期管理
   - 配额检查
   - Docker/ADB集成

3. **AuthService** (18-22 tests)
   - 登录/注册
   - JWT生成验证
   - 验证码验证

### 第二阶段：P1 服务（2-3 小时）
4. **AppsService** (15-20 tests)
   - APK上传下载
   - 应用安装卸载

5. **BillingService** (18-22 tests)
   - 订单管理
   - Saga补偿

### 第三阶段：P2 服务（1.5-2 小时）- 可选
6. **NotificationsService** (12-15 tests)
7. **QuotasService** (12-15 tests)

---

## 🎯 成功标准

- ✅ 所有 P0 + P1 服务测试完成（5 个服务）
- ✅ 测试通过率 ≥ 95%
- ✅ 核心业务逻辑覆盖率 100%
- ✅ 所有测试独立运行无依赖
- ✅ Mock 使用合理，无真实外部调用
- ✅ 测试命名清晰，使用中文描述
- ✅ AAA 模式一致性

---

## 📈 预期成果

完成 Phase 6 后，累计成果：

- **总服务数**: 28-32 (Phase 2-6)
- **总测试数**: 650-725
- **整体通过率**: ≥ 96%
- **测试代码**: ~28,000-32,000 行
- **累计投入**: ~30-36 小时

**核心价值**: 为整个平台的**核心业务功能**提供了全面的测试保障，确保产品质量和用户体验！💼

---

**文档创建日期**: 2025-10-30
**Phase 6 状态**: 📋 计划中 → 准备开始实施
**目标**: 完成 P0+P1 核心业务服务测试
