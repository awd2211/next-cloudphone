import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max, Matches, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * 自定义验证器：验证 CIDR 格式和范围限制
 */
@ValidatorConstraint({ name: 'isValidCidr', async: false })
export class IsValidCidrConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    if (!value || typeof value !== 'string') return false;

    // 严格的 CIDR 正则：IPv4 地址 + /掩码
    const cidrRegex = /^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\/(3[0-2]|[12]?\d)$/;
    if (!cidrRegex.test(value)) return false;

    const [, prefixLenStr] = value.split('/');
    const prefixLen = parseInt(prefixLenStr, 10);

    // 安全限制：最小掩码为 /20（4094 个 IP），防止扫描过大范围
    // /20 = 4094 IPs, /24 = 254 IPs, /23 = 510 IPs
    if (prefixLen < 20) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const value = args.value;
    if (!value) return '请输入网络 CIDR 地址';

    const cidrRegex = /^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\/(3[0-2]|[12]?\d)$/;
    if (!cidrRegex.test(value)) {
      return 'CIDR 格式无效，请使用如 192.168.1.0/24 的格式';
    }

    const [, prefixLenStr] = value.split('/');
    const prefixLen = parseInt(prefixLenStr, 10);
    if (prefixLen < 20) {
      return '子网范围过大（最小掩码 /20），请缩小扫描范围以避免资源耗尽';
    }

    return 'CIDR 格式无效';
  }
}

/**
 * 网络扫描 DTO
 *
 * 安全限制：
 * - CIDR 掩码最小 /20（最多 4094 个 IP）
 * - 并发数限制 10-200
 * - 超时时间限制 500ms-30s
 */
export class ScanNetworkDto {
  @ApiProperty({
    description: '网络 CIDR 地址（如 192.168.1.0/24），掩码最小 /20',
    example: '192.168.1.0/24',
  })
  @IsString()
  @Validate(IsValidCidrConstraint)
  networkCidr: string;

  @ApiPropertyOptional({
    description: 'ADB 端口起始范围',
    example: 5555,
    default: 5555,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  @Max(65535)
  portStart?: number;

  @ApiPropertyOptional({
    description: 'ADB 端口结束范围',
    example: 5565,
    default: 5565,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  @Max(65535)
  portEnd?: number;

  @ApiPropertyOptional({
    description: '并发扫描数量',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  concurrency?: number;

  @ApiPropertyOptional({
    description: '超时时间（毫秒），建议高延迟网络使用 5000+',
    example: 5000,
    default: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(30000)
  timeoutMs?: number;

  /**
   * SSE 端点的认证 Token
   *
   * 由于 EventSource API 不支持自定义 HTTP 头，
   * 需要通过查询参数传递 JWT Token 进行认证
   */
  @ApiPropertyOptional({
    description: 'JWT 认证 Token（SSE 端点专用，因为 EventSource 不支持自定义头）',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString()
  token?: string;
}
