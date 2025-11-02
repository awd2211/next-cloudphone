import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProxyInfo } from '../../common/interfaces';

/**
 * 代理信息响应DTO
 */
export class ProxyResponseDto {
  @ApiProperty({
    description: '代理唯一标识',
    example: 'brightdata-1234567890-abc',
  })
  id: string;

  @ApiProperty({
    description: '代理主机地址',
    example: 'brd.superproxy.io',
  })
  host: string;

  @ApiProperty({
    description: '代理端口',
    example: 22225,
  })
  port: number;

  @ApiPropertyOptional({
    description: '用户名（认证）',
    example: 'customer-username-session-12345',
  })
  username?: string;

  @ApiPropertyOptional({
    description: '密码（认证）',
    example: 'password123',
  })
  password?: string;

  @ApiProperty({
    description: '协议类型',
    enum: ['http', 'https', 'socks5'],
    example: 'http',
  })
  protocol: string;

  @ApiProperty({
    description: '供应商名称',
    example: 'brightdata',
  })
  provider: string;

  @ApiProperty({
    description: '地理位置信息',
    example: {
      country: 'US',
      city: 'New York',
    },
  })
  location: {
    country: string;
    city?: string;
    state?: string;
  };

  @ApiProperty({
    description: '代理质量分数 (0-100)',
    example: 95,
  })
  quality: number;

  @ApiProperty({
    description: '平均延迟（毫秒）',
    example: 120,
  })
  latency: number;

  @ApiProperty({
    description: '每GB成本（USD）',
    example: 10,
  })
  costPerGB: number;

  @ApiPropertyOptional({
    description: '会话ID',
    example: '1699999999-abc123',
  })
  sessionId?: string;

  @ApiProperty({
    description: '创建时间',
    example: '2025-11-02T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: '过期时间',
    example: '2025-11-02T11:00:00.000Z',
  })
  expiresAt?: Date;

  /**
   * 从 ProxyInfo 创建响应DTO
   */
  static fromProxyInfo(proxyInfo: ProxyInfo): ProxyResponseDto {
    const dto = new ProxyResponseDto();
    dto.id = proxyInfo.id;
    dto.host = proxyInfo.host;
    dto.port = proxyInfo.port;
    dto.username = proxyInfo.username;
    dto.password = proxyInfo.password;
    dto.protocol = proxyInfo.protocol;
    dto.provider = proxyInfo.provider;
    dto.location = proxyInfo.location;
    dto.quality = proxyInfo.quality;
    dto.latency = proxyInfo.latency;
    dto.costPerGB = proxyInfo.costPerGB;
    dto.sessionId = proxyInfo.sessionId;
    dto.createdAt = proxyInfo.createdAt;
    dto.expiresAt = proxyInfo.expiresAt;
    return dto;
  }
}

/**
 * 通用API响应包装
 */
export class ApiResponse<T> {
  @ApiProperty({
    description: '是否成功',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: '响应数据',
  })
  data?: T;

  @ApiPropertyOptional({
    description: '错误信息',
    example: 'Failed to acquire proxy',
  })
  error?: string;

  @ApiPropertyOptional({
    description: '错误代码',
    example: 'NO_PROVIDER_AVAILABLE',
  })
  errorCode?: string;

  @ApiProperty({
    description: '时间戳',
    example: '2025-11-02T10:30:00.000Z',
  })
  timestamp: Date;

  static success<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  }

  static error(error: string, errorCode?: string): ApiResponse<null> {
    return {
      success: false,
      error,
      errorCode,
      timestamp: new Date(),
    };
  }
}
