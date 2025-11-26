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

  @ApiProperty({
    description: '代理状态',
    enum: ['available', 'in_use', 'unavailable'],
    example: 'available',
  })
  status: 'available' | 'in_use' | 'unavailable';

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

  // ========== 真实出口 IP 信息 ==========

  @ApiPropertyOptional({
    description: '真实出口 IP 地址',
    example: '103.152.112.45',
  })
  exitIp?: string;

  @ApiPropertyOptional({
    description: '真实出口国家代码',
    example: 'US',
  })
  exitCountry?: string;

  @ApiPropertyOptional({
    description: '真实出口国家名称',
    example: 'United States',
  })
  exitCountryName?: string;

  @ApiPropertyOptional({
    description: '真实出口城市',
    example: 'Los Angeles',
  })
  exitCity?: string;

  @ApiPropertyOptional({
    description: '真实出口 ISP',
    example: 'Cogent Communications',
  })
  exitIsp?: string;

  @ApiPropertyOptional({
    description: 'IP 检测时间',
    example: '2025-11-02T10:35:00.000Z',
  })
  ipCheckedAt?: Date;

  // ========== 代理类型信息 ==========

  @ApiPropertyOptional({
    description: '代理类型（住宅/数据中心/移动/ISP）',
    enum: ['residential', 'datacenter', 'mobile', 'isp', 'unknown'],
    example: 'residential',
  })
  ispType?: string;

  @ApiPropertyOptional({
    description: '代理类型显示名称',
    example: '住宅代理',
  })
  proxyTypeDisplay?: string;

  @ApiPropertyOptional({
    description: '代理元数据',
    example: { type: 'tunnel', gateway: 'proxy.ipidea.io' },
  })
  metadata?: Record<string, any>;

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
    // 确保数值类型正确
    dto.quality = Number(proxyInfo.quality) || 0;
    dto.latency = Number(proxyInfo.latency) || 0;
    dto.costPerGB = Number(proxyInfo.costPerGB) || 0;
    // 根据 inUse 和 failureCount 计算状态
    dto.status = ProxyResponseDto.calculateStatus(proxyInfo);
    dto.sessionId = proxyInfo.sessionId;
    dto.createdAt = proxyInfo.createdAt;
    dto.expiresAt = proxyInfo.expiresAt;
    // 真实出口 IP 信息
    dto.exitIp = proxyInfo.exitIp;
    dto.exitCountry = proxyInfo.exitCountry;
    dto.exitCountryName = proxyInfo.exitCountryName;
    dto.exitCity = proxyInfo.exitCity;
    dto.exitIsp = proxyInfo.exitIsp;
    dto.ipCheckedAt = proxyInfo.ipCheckedAt;
    // 代理类型信息
    dto.ispType = proxyInfo.ispType;
    dto.proxyTypeDisplay = ProxyResponseDto.getProxyTypeDisplay(proxyInfo.ispType);
    dto.metadata = proxyInfo.metadata;
    return dto;
  }

  /**
   * 获取代理类型的显示名称
   */
  private static getProxyTypeDisplay(type?: string): string {
    if (!type) return '未知';
    const displayNames: Record<string, string> = {
      residential: '住宅代理',
      datacenter: '数据中心',
      mobile: '移动代理',
      isp: 'ISP代理',
      unknown: '未知',
    };
    return displayNames[type.toLowerCase()] || '未知';
  }

  /**
   * 根据代理信息计算状态
   * - unavailable: 失败次数 >= 3 或质量分数 < 20
   * - in_use: 正在被使用
   * - available: 可用
   */
  private static calculateStatus(proxyInfo: ProxyInfo): 'available' | 'in_use' | 'unavailable' {
    // 失败次数过多或质量太差，标记为不可用
    if ((proxyInfo.failureCount && proxyInfo.failureCount >= 3) || proxyInfo.quality < 20) {
      return 'unavailable';
    }
    // 正在使用中
    if (proxyInfo.inUse) {
      return 'in_use';
    }
    // 默认可用
    return 'available';
  }
}

// ApiResponse已移至api-response.dto.ts以避免重复定义
// 如需使用，请从 './api-response.dto' 导入
