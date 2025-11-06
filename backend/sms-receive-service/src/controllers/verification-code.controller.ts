import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { VerificationCodeExtractorService } from '../services/verification-code-extractor.service';
import { VerificationCodeCacheService } from '../services/verification-code-cache.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsMessage } from '../entities/sms-message.entity';
import { trace, SpanStatusCode } from '@opentelemetry/api';

/**
 * 提取验证码请求DTO
 */
class ExtractCodeDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  serviceCode?: string;
}

/**
 * 查询验证码请求DTO
 */
class QueryCodeDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  serviceCode: string;
}

/**
 * 标记验证码使用请求DTO
 */
class ConsumeCodeDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  serviceCode: string;

  @IsString()
  code: string;
}

/**
 * 验证码控制器
 *
 * 提供验证码相关的API接口，供device-service等其他服务调用
 */
@ApiTags('验证码')
@Controller('verification-codes')
export class VerificationCodeController {
  private readonly logger = new Logger(VerificationCodeController.name);
  private readonly tracer = trace.getTracer('sms-receive-service');

  constructor(
    private readonly extractorService: VerificationCodeExtractorService,
    private readonly cacheService: VerificationCodeCacheService,
    @InjectRepository(SmsMessage)
    private readonly smsMessageRepo: Repository<SmsMessage>,
  ) {}

  /**
   * 测试验证码提取（公开接口，用于测试）
   */
  @Post('extract')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '从SMS消息中提取验证码（测试接口）' })
  @ApiResponse({ status: 200, description: '提取成功' })
  @ApiResponse({ status: 404, description: '未找到验证码' })
  async extractCode(@Body() dto: ExtractCodeDto) {
    this.logger.log(`Extract code request for service: ${dto.serviceCode || 'unknown'}`);

    const result = await this.extractorService.extractCode(dto.message, dto.serviceCode);

    if (!result) {
      return {
        success: false,
        message: 'No verification code found in the message',
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 获取验证码（按手机号）
   * 主要供device-service调用
   */
  @Get('phone/:phoneNumber')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '按手机号查询验证码' })
  @ApiParam({ name: 'phoneNumber', description: '手机号码' })
  @ApiQuery({ name: 'serviceCode', description: '服务代码', required: true })
  @RequirePermission('sms:verification-code:read')
  async getCodeByPhone(
    @Param('phoneNumber') phoneNumber: string,
    @Query('serviceCode') serviceCode: string,
  ) {
    return await this.tracer.startActiveSpan(
      'verification-code.query_by_phone',
      {
        attributes: {
          'phone.number': phoneNumber,
          'service.code': serviceCode,
        },
      },
      async (span) => {
        try {
          this.logger.log(`Query code for ${phoneNumber}/${serviceCode}`);

          // 1. 先从缓存查询
          let cached = await this.cacheService.getCodeByPhone(phoneNumber, serviceCode);

          span.setAttribute('cache.hit', !!cached);

          // 2. 如果缓存未命中，从数据库查询并提取
          if (!cached) {
            // 通过 QueryBuilder 进行关联查询
            const smsMessages = await this.smsMessageRepo
              .createQueryBuilder('sms')
              .leftJoinAndSelect('sms.virtualNumber', 'vn')
              .where('vn.phone_number = :phoneNumber', { phoneNumber })
              .andWhere('vn.service_code = :serviceCode', { serviceCode })
              .orderBy('sms.received_at', 'DESC')
              .limit(5)
              .getMany();

            span.setAttribute('db.messages_checked', smsMessages.length);

            for (const msg of smsMessages) {
              const extracted = await this.extractorService.extractCode(msg.messageText, serviceCode);

              if (extracted) {
                // 缓存提取的验证码
                await this.cacheService.cacheCode(phoneNumber, serviceCode, extracted);

                span.setAttributes({
                  'code.found': true,
                  'code.source': 'database',
                  'code.pattern': extracted.patternType,
                });
                span.setStatus({ code: SpanStatusCode.OK });

                return {
                  success: true,
                  data: {
                    ...extracted,
                    phoneNumber,
                    serviceCode,
                    receivedAt: msg.receivedAt,
                    consumed: false,
                    source: 'database',
                  },
                };
              }
            }

            // 未找到
            span.setAttributes({
              'code.found': false,
            });
            span.setStatus({ code: SpanStatusCode.OK });

            return {
              success: false,
              message: 'No verification code found for this number',
            };
          }

          span.setAttributes({
            'code.found': true,
            'code.source': 'cache',
          });
          span.setStatus({ code: SpanStatusCode.OK });

          return {
            success: true,
            data: {
              ...cached,
              source: 'cache',
            },
          };
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * 获取验证码（按设备ID）
   * 供device-service快速查询当前设备的验证码
   */
  @Get('device/:deviceId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '按设备ID查询验证码' })
  @ApiParam({ name: 'deviceId', description: '设备ID' })
  @RequirePermission('sms:verification-code:read')
  async getCodeByDevice(@Param('deviceId') deviceId: string) {
    this.logger.log(`Query code for device ${deviceId}`);

    const cached = await this.cacheService.getCodeByDevice(deviceId);

    if (!cached) {
      return {
        success: false,
        message: 'No verification code found for this device',
      };
    }

    return {
      success: true,
      data: {
        ...cached,
        source: 'cache',
      },
    };
  }

  /**
   * 验证验证码是否有效
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证验证码是否有效' })
  @RequirePermission('sms:verification-code:validate')
  async validateCode(@Body() dto: ConsumeCodeDto) {
    this.logger.log(`Validate code for ${dto.phoneNumber}/${dto.serviceCode}`);

    const isValid = await this.cacheService.isCodeValid(
      dto.phoneNumber,
      dto.serviceCode,
      dto.code,
    );

    return {
      success: true,
      valid: isValid,
    };
  }

  /**
   * 标记验证码已使用
   */
  @Post('consume')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '标记验证码已使用' })
  @RequirePermission('sms:verification-code:consume')
  async consumeCode(@Body() dto: ConsumeCodeDto) {
    return await this.tracer.startActiveSpan(
      'verification-code.consume',
      {
        attributes: {
          'phone.number': dto.phoneNumber,
          'service.code': dto.serviceCode,
          'code.value': dto.code,
        },
      },
      async (span) => {
        try {
          this.logger.log(`Consume code for ${dto.phoneNumber}/${dto.serviceCode}`);

          // 先验证
          const isValid = await this.cacheService.isCodeValid(
            dto.phoneNumber,
            dto.serviceCode,
            dto.code,
          );

          span.setAttribute('code.valid', isValid);

          if (!isValid) {
            span.setStatus({ code: SpanStatusCode.OK });
            return {
              success: false,
              message: 'Invalid or expired verification code',
            };
          }

          // 标记已使用
          const consumed = await this.cacheService.markCodeConsumed(dto.phoneNumber, dto.serviceCode);

          span.setAttributes({
            'code.consumed': consumed,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          return {
            success: consumed,
            message: consumed ? 'Code marked as consumed' : 'Failed to consume code',
          };
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * 获取支持的验证码模式列表
   */
  @Get('patterns')
  @Public()
  @ApiOperation({ summary: '获取支持的验证码识别模式' })
  async getSupportedPatterns() {
    const patterns = this.extractorService.getSupportedPatterns();

    return {
      success: true,
      data: {
        total: patterns.length,
        patterns,
      },
    };
  }

  /**
   * 测试特定模式
   */
  @Post('test-pattern')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '测试特定验证码识别模式' })
  async testPattern(@Body() body: { message: string; patternName: string }) {
    const result = this.extractorService.testPattern(body.message, body.patternName);

    if (!result) {
      return {
        success: false,
        message: 'Pattern did not match or code is invalid',
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 获取缓存统计
   */
  @Get('cache/stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取验证码缓存统计' })
  @RequirePermission('sms:statistics:view')
  async getCacheStats() {
    const stats = await this.cacheService.getCacheStatistics();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * 批量查询验证码（供内部服务使用）
   */
  @Post('batch-query')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量查询验证码' })
  @RequirePermission('sms:verification-code:read')
  async batchQueryCodes(
    @Body() body: { requests: Array<{ phoneNumber: string; serviceCode: string }> },
  ) {
    this.logger.log(`Batch query codes for ${body.requests.length} requests`);

    const results = await this.cacheService.getMultipleCodes(body.requests);

    const response = Array.from(results.entries()).map(([key, value]) => ({
      key,
      found: value !== null,
      data: value,
    }));

    return {
      success: true,
      data: response,
    };
  }
}
