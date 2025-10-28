import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '@cloudphone/shared';

/**
 * 余额检查响应
 */
export interface BalanceCheckResponse {
  allowed: boolean;
  balance: number;
  currency?: string;
}

/**
 * 余额扣减响应
 */
export interface BalanceDeductResponse {
  success: boolean;
  newBalance: number;
  transactionId: string;
}

/**
 * 余额客户端服务
 *
 * 负责与 user-service 通信，进行余额检查和扣减操作
 * 使用熔断器保护，避免 user-service 故障时影响整体服务
 */
@Injectable()
export class BalanceClientService {
  private readonly logger = new Logger(BalanceClientService.name);
  private readonly userServiceUrl: string;

  constructor(
    private readonly httpClient: HttpClientService,
    private readonly configService: ConfigService,
  ) {
    this.userServiceUrl =
      this.configService.get<string>('USER_SERVICE_URL') ||
      'http://localhost:30001';
  }

  /**
   * 检查用户余额是否足够
   *
   * @param userId - 用户 ID
   * @param amount - 需要的金额
   * @returns 余额检查结果
   */
  async checkBalance(
    userId: string,
    amount: number,
  ): Promise<BalanceCheckResponse> {
    this.logger.log(`Checking balance for user ${userId}, amount: ${amount}`);

    try {
      const data = await this.httpClient.get<BalanceCheckResponse>(
        `${this.userServiceUrl}/api/users/${userId}/balance/check?amount=${amount}`,
        {},
        {
          timeout: 5000,
          retries: 3,
          circuitBreaker: true,
        },
      );

      this.logger.log(
        `Balance check result for user ${userId}: allowed=${data.allowed}, balance=${data.balance}`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to check balance for user ${userId}: ${error.message}`,
        error.stack,
      );

      // 如果是熔断器打开，说明 user-service 不可用
      if (error.message?.includes('Circuit breaker is open')) {
        throw new ServiceUnavailableException(
          '用户服务暂时不可用，请稍后重试',
        );
      }

      // 如果是 400 错误，说明余额不足
      if (error.response?.status === 400) {
        throw new BadRequestException(
          error.response.data?.message || '余额不足',
        );
      }

      // 其他错误
      throw new ServiceUnavailableException(
        '余额检查失败，请稍后重试',
      );
    }
  }

  /**
   * 扣减用户余额
   *
   * @param userId - 用户 ID
   * @param amount - 扣减金额
   * @param orderId - 订单 ID（用于幂等性）
   * @returns 扣减结果
   */
  async deductBalance(
    userId: string,
    amount: number,
    orderId: string,
  ): Promise<BalanceDeductResponse> {
    this.logger.log(
      `Deducting balance for user ${userId}, amount: ${amount}, orderId: ${orderId}`,
    );

    try {
      const data = await this.httpClient.post<BalanceDeductResponse>(
        `${this.userServiceUrl}/api/users/${userId}/balance/deduct`,
        {
          amount,
          orderId,
          reason: 'ORDER_PAYMENT',
        },
        {},
        {
          timeout: 5000,
          retries: 3,
          circuitBreaker: true,
        },
      );

      this.logger.log(
        `Balance deducted for user ${userId}: newBalance=${data.newBalance}, transactionId=${data.transactionId}`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to deduct balance for user ${userId}: ${error.message}`,
        error.stack,
      );

      // 如果是熔断器打开，说明 user-service 不可用
      if (error.message?.includes('Circuit breaker is open')) {
        throw new ServiceUnavailableException(
          '用户服务暂时不可用，请稍后重试',
        );
      }

      // 如果是 400 错误，说明余额不足或参数错误
      if (error.response?.status === 400) {
        throw new BadRequestException(
          error.response.data?.message || '余额扣减失败',
        );
      }

      // 如果是 409 冲突，说明订单已经扣过款（幂等性保护）
      if (error.response?.status === 409) {
        this.logger.warn(
          `Order ${orderId} already deducted, returning cached result`,
        );
        return error.response.data;
      }

      // 其他错误
      throw new ServiceUnavailableException(
        '余额扣减失败，请稍后重试',
      );
    }
  }

  /**
   * 退款到用户余额
   *
   * @param userId - 用户 ID
   * @param amount - 退款金额
   * @param orderId - 订单 ID
   * @returns 退款结果
   */
  async refundBalance(
    userId: string,
    amount: number,
    orderId: string,
  ): Promise<BalanceDeductResponse> {
    this.logger.log(
      `Refunding balance for user ${userId}, amount: ${amount}, orderId: ${orderId}`,
    );

    try {
      const data = await this.httpClient.post<BalanceDeductResponse>(
        `${this.userServiceUrl}/api/users/${userId}/balance/refund`,
        {
          amount,
          orderId,
          reason: 'ORDER_REFUND',
        },
        {},
        {
          timeout: 5000,
          retries: 3,
          circuitBreaker: true,
        },
      );

      this.logger.log(
        `Balance refunded for user ${userId}: newBalance=${data.newBalance}`,
      );

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to refund balance for user ${userId}: ${error.message}`,
        error.stack,
      );

      // 退款失败需要记录，以便人工处理
      throw new ServiceUnavailableException(
        '退款失败，请联系客服处理',
      );
    }
  }
}
