import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  SagaOrchestratorService,
  SagaDefinition,
  SagaType,
  EventBusService,
} from '@cloudphone/shared';
import { User, UserStatus } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Quota, QuotaStatus, QuotaLimits } from '../entities/quota.entity';
import { RegisterDto } from './dto/register.dto';
import { UserMetricsService } from '../metrics/user-metrics.service';

/**
 * 用户注册 Saga 状态
 */
export interface UserRegistrationSagaState {
  // 输入
  username: string;
  email: string;
  password: string;
  fullName?: string;

  // Step 1: VALIDATE_USER
  validated?: boolean;
  hashedPassword?: string;

  // Step 2: CREATE_USER
  userId?: string;
  user?: User;

  // Step 3: ASSIGN_DEFAULT_ROLE
  roleAssigned?: boolean;
  defaultRoleId?: string;

  // Step 4: INITIALIZE_QUOTA
  quotaId?: string;
  quotaInitialized?: boolean;

  // Step 5: PUBLISH_EVENT
  eventPublished?: boolean;
}

/**
 * 用户注册 Saga
 *
 * 协调用户注册的多步骤流程：
 * 1. 验证用户数据（检查重复）
 * 2. 创建用户记录
 * 3. 分配默认角色
 * 4. 初始化默认配额
 * 5. 发布 user.registered 事件
 *
 * 补偿逻辑：
 * - 如果任何步骤失败，回滚已创建的资源
 * - 删除用户、角色关联、配额记录
 */
@Injectable()
export class UserRegistrationSaga {
  private readonly logger = new Logger(UserRegistrationSaga.name);

  // 默认配额配置 - 免费套餐
  private readonly DEFAULT_QUOTA_LIMITS: QuotaLimits = {
    // 设备限制
    maxDevices: 2, // 免费用户最多 2 台设备
    maxConcurrentDevices: 1, // 同时只能运行 1 台

    // 资源限制
    maxCpuCoresPerDevice: 2, // 每台设备最多 2 核 CPU
    maxMemoryMBPerDevice: 2048, // 每台设备最多 2GB 内存
    maxStorageGBPerDevice: 10, // 每台设备最多 10GB 存储
    totalCpuCores: 4, // 总共 4 核 CPU 配额
    totalMemoryGB: 4, // 总共 4GB 内存配额
    totalStorageGB: 20, // 总共 20GB 存储配额

    // 带宽限制
    maxBandwidthMbps: 5, // 最大 5Mbps 带宽
    monthlyTrafficGB: 50, // 每月 50GB 流量

    // 时长限制
    maxUsageHoursPerDay: 8, // 每天最多 8 小时
    maxUsageHoursPerMonth: 100, // 每月最多 100 小时
  };

  constructor(
    private readonly sagaOrchestrator: SagaOrchestratorService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Quota)
    private readonly quotaRepository: Repository<Quota>,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource,
    private readonly userMetrics: UserMetricsService,
  ) {}

  /**
   * 开始用户注册 Saga
   */
  async startRegistration(registerDto: RegisterDto): Promise<{ sagaId: string }> {
    this.logger.log(`Starting user registration Saga for ${registerDto.username}`);

    // ✅ 记录注册尝试
    this.userMetrics.recordRegistrationAttempt();

    const initialState: UserRegistrationSagaState = {
      username: registerDto.username,
      email: registerDto.email,
      password: registerDto.password,
      fullName: registerDto.fullName,
    };

    const sagaDefinition = this.createSagaDefinition();

    try {
      const sagaId = await this.sagaOrchestrator.executeSaga(sagaDefinition, initialState);
      return { sagaId };
    } catch (error) {
      // ✅ 记录注册失败
      const reason = error.message || 'unknown';
      this.userMetrics.recordRegistrationFailure(reason);
      throw error;
    }
  }

  /**
   * 查询 Saga 状态
   */
  async getSagaStatus(sagaId: string) {
    return await this.sagaOrchestrator.getSagaState(sagaId);
  }

  /**
   * 创建 Saga 定义
   */
  private createSagaDefinition(): SagaDefinition<UserRegistrationSagaState> {
    return {
      type: SagaType.USER_REGISTRATION,
      timeoutMs: 60 * 1000, // 1 分钟超时
      maxRetries: 3,
      steps: [
        {
          name: 'VALIDATE_USER',
          execute: this.validateUser.bind(this),
          compensate: this.compensateValidateUser.bind(this),
        },
        {
          name: 'CREATE_USER',
          execute: this.createUser.bind(this),
          compensate: this.compensateCreateUser.bind(this),
        },
        {
          name: 'ASSIGN_DEFAULT_ROLE',
          execute: this.assignDefaultRole.bind(this),
          compensate: this.compensateAssignRole.bind(this),
        },
        {
          name: 'INITIALIZE_QUOTA',
          execute: this.initializeQuota.bind(this),
          compensate: this.compensateInitializeQuota.bind(this),
        },
        {
          name: 'PUBLISH_EVENT',
          execute: this.publishRegisteredEvent.bind(this),
          compensate: this.compensatePublishEvent.bind(this),
        },
      ],
    };
  }

  // ==================== Step 1: VALIDATE_USER ====================

  private async validateUser(
    state: UserRegistrationSagaState
  ): Promise<Partial<UserRegistrationSagaState>> {
    this.logger.log(`[VALIDATE_USER] Validating user ${state.username}`);

    // 检查用户名和邮箱是否已存在
    const existingUser = await this.userRepository.findOne({
      where: [{ username: state.username }, { email: state.email }],
    });

    if (existingUser) {
      if (existingUser.username === state.username) {
        throw new ConflictException('用户名已存在');
      }
      if (existingUser.email === state.email) {
        throw new ConflictException('邮箱已存在');
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(state.password, 10);

    this.logger.log(`[VALIDATE_USER] Validation successful`);
    return {
      validated: true,
      hashedPassword,
    };
  }

  private async compensateValidateUser(state: UserRegistrationSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_VALIDATE_USER] Nothing to compensate for validation`);
    // 验证步骤无需补偿
  }

  // ==================== Step 2: CREATE_USER ====================

  private async createUser(
    state: UserRegistrationSagaState
  ): Promise<Partial<UserRegistrationSagaState>> {
    this.logger.log(`[CREATE_USER] Creating user ${state.username}`);

    const user = this.userRepository.create({
      username: state.username,
      email: state.email,
      password: state.hashedPassword,
      fullName: state.fullName,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`[CREATE_USER] User created with ID: ${savedUser.id}`);

    return {
      userId: savedUser.id,
      user: savedUser,
    };
  }

  private async compensateCreateUser(state: UserRegistrationSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_CREATE_USER] Deleting user ${state.userId}`);

    if (state.userId) {
      try {
        await this.userRepository.delete(state.userId);
        this.logger.log(`[COMPENSATE_CREATE_USER] User deleted`);
      } catch (error) {
        this.logger.error(`[COMPENSATE_CREATE_USER] Failed to delete user: ${error.message}`);
      }
    }
  }

  // ==================== Step 3: ASSIGN_DEFAULT_ROLE ====================

  private async assignDefaultRole(
    state: UserRegistrationSagaState
  ): Promise<Partial<UserRegistrationSagaState>> {
    this.logger.log(`[ASSIGN_DEFAULT_ROLE] Assigning default role to user ${state.userId}`);

    // 查找默认角色（"user" 角色）
    const defaultRole = await this.roleRepository.findOne({
      where: { name: 'user' },
    });

    if (!defaultRole) {
      throw new Error('Default role "user" not found in system');
    }

    // 使用原生 SQL 插入用户-角色关联（避免实体关系复杂性）
    await this.dataSource.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [state.userId, defaultRole.id]
    );

    // ✅ 记录角色分配
    this.userMetrics.recordRoleAssigned(state.userId!, defaultRole.name);

    this.logger.log(`[ASSIGN_DEFAULT_ROLE] Role assigned successfully`);
    return {
      roleAssigned: true,
      defaultRoleId: defaultRole.id,
    };
  }

  private async compensateAssignRole(state: UserRegistrationSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_ASSIGN_ROLE] Removing role assignment for user ${state.userId}`);

    if (state.userId && state.defaultRoleId) {
      try {
        await this.dataSource.query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, [
          state.userId,
          state.defaultRoleId,
        ]);
        this.logger.log(`[COMPENSATE_ASSIGN_ROLE] Role assignment removed`);
      } catch (error) {
        this.logger.error(`[COMPENSATE_ASSIGN_ROLE] Failed to remove role: ${error.message}`);
      }
    }
  }

  // ==================== Step 4: INITIALIZE_QUOTA ====================

  private async initializeQuota(
    state: UserRegistrationSagaState
  ): Promise<Partial<UserRegistrationSagaState>> {
    this.logger.log(`[INITIALIZE_QUOTA] Initializing default quota for user ${state.userId}`);

    const quota = this.quotaRepository.create({
      userId: state.userId,
      planId: 'default-free-plan',
      planName: '免费套餐',
      status: QuotaStatus.ACTIVE,
      limits: this.DEFAULT_QUOTA_LIMITS,
      usage: this.initializeUsage(),
      validFrom: new Date(),
      // validUntil 省略表示永久有效
      autoRenew: false,
      notes: '新用户默认配额',
    });

    const savedQuota = await this.quotaRepository.save(quota);
    this.logger.log(`[INITIALIZE_QUOTA] Quota initialized with ID: ${savedQuota.id}`);

    return {
      quotaId: savedQuota.id,
      quotaInitialized: true,
    };
  }

  private async compensateInitializeQuota(state: UserRegistrationSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_INITIALIZE_QUOTA] Deleting quota ${state.quotaId}`);

    if (state.quotaId) {
      try {
        await this.quotaRepository.delete(state.quotaId);
        this.logger.log(`[COMPENSATE_INITIALIZE_QUOTA] Quota deleted`);
      } catch (error) {
        this.logger.error(`[COMPENSATE_INITIALIZE_QUOTA] Failed to delete quota: ${error.message}`);
      }
    }
  }

  // ==================== Step 5: PUBLISH_EVENT ====================

  private async publishRegisteredEvent(
    state: UserRegistrationSagaState
  ): Promise<Partial<UserRegistrationSagaState>> {
    this.logger.log(`[PUBLISH_EVENT] Publishing user.registered event`);

    await this.eventBus.publishUserEvent('registered', {
      userId: state.userId,
      username: state.username,
      email: state.email,
      quotaId: state.quotaId,
      timestamp: new Date().toISOString(),
    });

    // ✅ 记录注册成功
    this.userMetrics.recordRegistrationSuccess();

    this.logger.log(`[PUBLISH_EVENT] Event published successfully`);
    return { eventPublished: true };
  }

  private async compensatePublishEvent(state: UserRegistrationSagaState): Promise<void> {
    this.logger.log(`[COMPENSATE_PUBLISH_EVENT] Cannot compensate event publishing`);

    // 发布补偿事件，通知其他服务注册失败
    try {
      await this.eventBus.publishUserEvent('registration_failed', {
        userId: state.userId,
        username: state.username,
        email: state.email,
        reason: 'Registration Saga compensation triggered',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `[COMPENSATE_PUBLISH_EVENT] Failed to publish compensation event: ${error.message}`
      );
    }
  }

  // ==================== Helpers ====================

  /**
   * 初始化空的配额使用记录
   */
  private initializeUsage() {
    return {
      currentDevices: 0,
      currentConcurrentDevices: 0,
      usedCpuCores: 0,
      usedMemoryGB: 0,
      usedStorageGB: 0,
      currentBandwidthMbps: 0,
      monthlyTrafficUsedGB: 0,
      todayUsageHours: 0,
      monthlyUsageHours: 0,
      lastUpdatedAt: new Date(),
    };
  }
}
