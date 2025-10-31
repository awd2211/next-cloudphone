import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserBalance, BalanceStatus } from './entities/user-balance.entity';
import {
  BalanceTransaction,
  TransactionType,
  TransactionStatus,
} from './entities/balance-transaction.entity';

export interface CreateBalanceDto {
  userId: string;
  initialBalance?: number;
  lowBalanceThreshold?: number;
  autoRecharge?: boolean;
  autoRechargeAmount?: number;
  autoRechargeTrigger?: number;
}

export interface RechargeBalanceDto {
  userId: string;
  amount: number;
  orderId?: string;
  paymentId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ConsumeBalanceDto {
  userId: string;
  amount: number;
  deviceId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface FreezeBalanceDto {
  userId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface AdjustBalanceDto {
  userId: string;
  amount: number;
  operatorId: string;
  reason: string;
}

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    @InjectRepository(UserBalance)
    private balanceRepository: Repository<UserBalance>,
    @InjectRepository(BalanceTransaction)
    private transactionRepository: Repository<BalanceTransaction>,
    private dataSource: DataSource
  ) {}

  /**
   * 创建用户余额账户
   */
  async createBalance(dto: CreateBalanceDto): Promise<UserBalance> {
    const existing = await this.balanceRepository.findOne({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new BadRequestException('用户余额账户已存在');
    }

    const balance = this.balanceRepository.create({
      userId: dto.userId,
      balance: dto.initialBalance || 0,
      frozenAmount: 0,
      totalRecharge: dto.initialBalance || 0,
      totalConsumption: 0,
      status: BalanceStatus.NORMAL,
      lowBalanceThreshold: dto.lowBalanceThreshold || 100,
      autoRecharge: dto.autoRecharge || false,
      autoRechargeAmount: dto.autoRechargeAmount,
      autoRechargeTrigger: dto.autoRechargeTrigger,
    });

    const savedBalance = await this.balanceRepository.save(balance);
    this.logger.log(`余额账户已创建 - 用户: ${dto.userId}, ID: ${savedBalance.id}`);

    // 如果有初始余额，记录交易
    if (dto.initialBalance && dto.initialBalance > 0) {
      await this.recordTransaction({
        userId: dto.userId,
        balanceId: savedBalance.id,
        type: TransactionType.RECHARGE,
        amount: dto.initialBalance,
        balanceBefore: 0,
        balanceAfter: dto.initialBalance,
        status: TransactionStatus.SUCCESS,
        description: '初始余额',
      });
    }

    return savedBalance;
  }

  /**
   * 获取用户余额
   */
  async getUserBalance(userId: string): Promise<UserBalance> {
    const balance = await this.balanceRepository.findOne({
      where: { userId },
    });

    if (!balance) {
      throw new NotFoundException(`用户 ${userId} 余额账户未找到`);
    }

    // 更新状态
    await this.updateBalanceStatus(balance);

    return balance;
  }

  /**
   * 充值
   */
  async recharge(dto: RechargeBalanceDto): Promise<{
    balance: UserBalance;
    transaction: BalanceTransaction;
  }> {
    if (dto.amount <= 0) {
      throw new BadRequestException('充值金额必须大于 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(UserBalance, {
        where: { userId: dto.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balance) {
        throw new NotFoundException(`用户 ${dto.userId} 余额账户未找到`);
      }

      const balanceBefore = Number(balance.balance);
      balance.balance = Number(balance.balance) + dto.amount;
      balance.totalRecharge = Number(balance.totalRecharge) + dto.amount;
      balance.lastRechargeAt = new Date();

      const transaction = queryRunner.manager.create(BalanceTransaction, {
        userId: dto.userId,
        balanceId: balance.id,
        type: TransactionType.RECHARGE,
        amount: dto.amount,
        balanceBefore,
        balanceAfter: Number(balance.balance),
        status: TransactionStatus.SUCCESS,
        orderId: dto.orderId,
        paymentId: dto.paymentId,
        description: dto.description || '余额充值',
        metadata: dto.metadata,
      });

      await queryRunner.manager.save(balance);
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(
        `充值成功 - 用户: ${dto.userId}, 金额: ${dto.amount}, 余额: ${balance.balance}`
      );

      return { balance, transaction };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`充值失败 - 用户: ${dto.userId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 消费
   */
  async consume(dto: ConsumeBalanceDto): Promise<{
    balance: UserBalance;
    transaction: BalanceTransaction;
  }> {
    if (dto.amount <= 0) {
      throw new BadRequestException('消费金额必须大于 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(UserBalance, {
        where: { userId: dto.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balance) {
        throw new NotFoundException(`用户 ${dto.userId} 余额账户未找到`);
      }

      if (balance.status === BalanceStatus.FROZEN) {
        throw new BadRequestException('余额已冻结，无法消费');
      }

      if (!balance.canConsume(dto.amount)) {
        throw new BadRequestException(
          `余额不足 (可用: ${balance.getAvailableBalance()}, 需要: ${dto.amount})`
        );
      }

      const balanceBefore = Number(balance.balance);
      balance.balance = Number(balance.balance) - dto.amount;
      balance.totalConsumption = Number(balance.totalConsumption) + dto.amount;
      balance.lastConsumeAt = new Date();

      const transaction = queryRunner.manager.create(BalanceTransaction, {
        userId: dto.userId,
        balanceId: balance.id,
        type: TransactionType.CONSUME,
        amount: dto.amount,
        balanceBefore,
        balanceAfter: Number(balance.balance),
        status: TransactionStatus.SUCCESS,
        deviceId: dto.deviceId,
        description: dto.description || '余额消费',
        metadata: dto.metadata,
      });

      await queryRunner.manager.save(balance);
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(
        `消费成功 - 用户: ${dto.userId}, 金额: ${dto.amount}, 余额: ${balance.balance}`
      );

      // 检查是否需要自动充值
      if (balance.autoRecharge && balance.autoRechargeTrigger) {
        if (Number(balance.balance) <= balance.autoRechargeTrigger) {
          this.logger.warn(`余额低于自动充值阈值 - 用户: ${dto.userId}, 触发自动充值`);
          // 这里可以触发自动充值流程
        }
      }

      return { balance, transaction };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`消费失败 - 用户: ${dto.userId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 冻结余额
   */
  async freezeBalance(dto: FreezeBalanceDto): Promise<{
    balance: UserBalance;
    transaction: BalanceTransaction;
  }> {
    if (dto.amount <= 0) {
      throw new BadRequestException('冻结金额必须大于 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(UserBalance, {
        where: { userId: dto.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balance) {
        throw new NotFoundException(`用户 ${dto.userId} 余额账户未找到`);
      }

      if (balance.getAvailableBalance() < dto.amount) {
        throw new BadRequestException('可用余额不足，无法冻结');
      }

      const balanceBefore = Number(balance.frozenAmount);
      balance.frozenAmount = Number(balance.frozenAmount) + dto.amount;

      const transaction = queryRunner.manager.create(BalanceTransaction, {
        userId: dto.userId,
        balanceId: balance.id,
        type: TransactionType.FREEZE,
        amount: dto.amount,
        balanceBefore: Number(balance.balance),
        balanceAfter: Number(balance.balance),
        status: TransactionStatus.SUCCESS,
        description: dto.reason,
        metadata: dto.metadata,
      });

      await queryRunner.manager.save(balance);
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(`冻结余额成功 - 用户: ${dto.userId}, 金额: ${dto.amount}`);

      return { balance, transaction };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`冻结余额失败 - 用户: ${dto.userId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 解冻余额
   */
  async unfreezeBalance(
    userId: string,
    amount: number,
    reason: string
  ): Promise<{
    balance: UserBalance;
    transaction: BalanceTransaction;
  }> {
    if (amount <= 0) {
      throw new BadRequestException('解冻金额必须大于 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(UserBalance, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balance) {
        throw new NotFoundException(`用户 ${userId} 余额账户未找到`);
      }

      if (Number(balance.frozenAmount) < amount) {
        throw new BadRequestException('冻结金额不足，无法解冻');
      }

      balance.frozenAmount = Number(balance.frozenAmount) - amount;

      const transaction = queryRunner.manager.create(BalanceTransaction, {
        userId,
        balanceId: balance.id,
        type: TransactionType.UNFREEZE,
        amount,
        balanceBefore: Number(balance.balance),
        balanceAfter: Number(balance.balance),
        status: TransactionStatus.SUCCESS,
        description: reason,
      });

      await queryRunner.manager.save(balance);
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(`解冻余额成功 - 用户: ${userId}, 金额: ${amount}`);

      return { balance, transaction };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`解冻余额失败 - 用户: ${userId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 余额调整（管理员操作）
   */
  async adjustBalance(dto: AdjustBalanceDto): Promise<{
    balance: UserBalance;
    transaction: BalanceTransaction;
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const balance = await queryRunner.manager.findOne(UserBalance, {
        where: { userId: dto.userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!balance) {
        throw new NotFoundException(`用户 ${dto.userId} 余额账户未找到`);
      }

      const balanceBefore = Number(balance.balance);
      balance.balance = Number(balance.balance) + dto.amount;

      if (dto.amount > 0) {
        balance.totalRecharge = Number(balance.totalRecharge) + dto.amount;
      }

      const transaction = queryRunner.manager.create(BalanceTransaction, {
        userId: dto.userId,
        balanceId: balance.id,
        type: TransactionType.ADJUSTMENT,
        amount: Math.abs(dto.amount),
        balanceBefore,
        balanceAfter: Number(balance.balance),
        status: TransactionStatus.SUCCESS,
        description: dto.reason,
        operatorId: dto.operatorId,
      });

      await queryRunner.manager.save(balance);
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(
        `余额调整成功 - 用户: ${dto.userId}, 金额: ${dto.amount}, 操作人: ${dto.operatorId}`
      );

      return { balance, transaction };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`余额调整失败 - 用户: ${dto.userId}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 获取交易记录
   */
  async getTransactions(
    userId: string,
    options?: {
      type?: TransactionType;
      status?: TransactionStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transactions: BalanceTransaction[]; total: number }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId });

    if (options?.type) {
      queryBuilder.andWhere('transaction.type = :type', { type: options.type });
    }

    if (options?.status) {
      queryBuilder.andWhere('transaction.status = :status', {
        status: options.status,
      });
    }

    queryBuilder.orderBy('transaction.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    const transactions = await queryBuilder.getMany();

    return { transactions, total };
  }

  /**
   * 获取余额统计
   */
  async getBalanceStatistics(userId: string): Promise<{
    balance: UserBalance;
    recentTransactions: BalanceTransaction[];
    monthlyRecharge: number;
    monthlyConsumption: number;
    weeklyConsumption: number;
  }> {
    const balance = await this.getUserBalance(userId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 最近10条交易
    const { transactions: recentTransactions } = await this.getTransactions(userId, { limit: 10 });

    // 本月充值
    const monthlyRecharge = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: TransactionType.RECHARGE })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.SUCCESS,
      })
      .andWhere('transaction.createdAt >= :monthStart', { monthStart })
      .select('SUM(transaction.amount)', 'total')
      .getRawOne()
      .then((result) => Number(result.total) || 0);

    // 本月消费
    const monthlyConsumption = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: TransactionType.CONSUME })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.SUCCESS,
      })
      .andWhere('transaction.createdAt >= :monthStart', { monthStart })
      .select('SUM(transaction.amount)', 'total')
      .getRawOne()
      .then((result) => Number(result.total) || 0);

    // 本周消费
    const weeklyConsumption = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.type = :type', { type: TransactionType.CONSUME })
      .andWhere('transaction.status = :status', {
        status: TransactionStatus.SUCCESS,
      })
      .andWhere('transaction.createdAt >= :weekStart', { weekStart })
      .select('SUM(transaction.amount)', 'total')
      .getRawOne()
      .then((result) => Number(result.total) || 0);

    return {
      balance,
      recentTransactions,
      monthlyRecharge,
      monthlyConsumption,
      weeklyConsumption,
    };
  }

  // 私有辅助方法
  private async recordTransaction(data: Partial<BalanceTransaction>): Promise<BalanceTransaction> {
    const transaction = this.transactionRepository.create(data);
    return await this.transactionRepository.save(transaction);
  }

  private async updateBalanceStatus(balance: UserBalance): Promise<void> {
    const availableBalance = balance.getAvailableBalance();

    let newStatus = balance.status;

    if (balance.status === BalanceStatus.FROZEN) {
      return; // 冻结状态不自动变更
    }

    if (availableBalance <= 0) {
      newStatus = BalanceStatus.INSUFFICIENT;
    } else if (availableBalance <= Number(balance.lowBalanceThreshold)) {
      newStatus = BalanceStatus.LOW;
    } else {
      newStatus = BalanceStatus.NORMAL;
    }

    if (newStatus !== balance.status) {
      balance.status = newStatus;
      await this.balanceRepository.save(balance);
      this.logger.warn(`余额状态变更 - 用户: ${balance.userId}, 状态: ${balance.status}`);
    }
  }
}
