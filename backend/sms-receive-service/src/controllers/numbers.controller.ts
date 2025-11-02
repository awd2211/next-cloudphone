import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { NumberManagementService } from '../services/number-management.service';
import { MessagePollingService } from '../services/message-polling.service';
import { RequestNumberDto, BatchRequestNumberDto } from '../dto/request-number.dto';

@Controller('numbers')
export class NumbersController {
  private readonly logger = new Logger(NumbersController.name);

  constructor(
    private readonly numberManagement: NumberManagementService,
    private readonly messagePolling: MessagePollingService,
  ) {}

  /**
   * 请求虚拟号码
   * POST /numbers/request
   */
  @Post('request')
  async requestNumber(@Body() dto: RequestNumberDto) {
    try {
      const number = await this.numberManagement.requestNumber(dto);

      // 启动轮询检查验证码
      this.messagePolling.startPolling(number.id);

      return {
        success: true,
        data: {
          id: number.id,
          phoneNumber: number.phoneNumber,
          provider: number.provider,
          service: number.serviceName,
          country: number.countryCode,
          cost: number.cost,
          status: number.status,
          expiresAt: number.expiresAt,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to request number: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取号码状态
   * GET /numbers/:id
   */
  @Get(':id')
  async getNumberStatus(@Param('id') id: string) {
    try {
      const number = await this.numberManagement.getNumberStatus(id);

      return {
        success: true,
        data: {
          id: number.id,
          phoneNumber: number.phoneNumber,
          status: number.status,
          verificationCode: null, // Will be set when received
          receivedAt: number.smsReceivedAt,
          expiresAt: number.expiresAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 取消号码
   * POST /numbers/:id/cancel
   */
  @Post(':id/cancel')
  async cancelNumber(@Param('id') id: string) {
    try {
      const result = await this.numberManagement.cancelNumber(id);

      // 停止轮询
      this.messagePolling.stopPolling(id);

      return {
        success: true,
        data: result,
        message: 'Number cancelled successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 批量请求号码
   * POST /numbers/batch-request
   */
  @Post('batch-request')
  async batchRequest(@Body() dto: BatchRequestNumberDto) {
    try {
      const result = await this.numberManagement.batchRequest(
        dto.service,
        dto.country,
        dto.deviceIds,
      );

      // 为所有成功的号码启动轮询
      result.numbers
        .filter((n) => n.numberId !== null)
        .forEach((n) => {
          this.messagePolling.startPolling(n.numberId!);
        });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取轮询状态
   * GET /numbers/polling/status
   */
  @Get('polling/status')
  async getPollingStatus() {
    return {
      success: true,
      data: {
        activePollingCount: this.messagePolling.getActivePollingCount(),
      },
    };
  }
}
