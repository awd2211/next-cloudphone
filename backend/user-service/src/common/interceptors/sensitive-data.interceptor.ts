import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 敏感数据脱敏拦截器
 * 自动移除响应中的敏感字段，防止数据泄露
 */
@Injectable()
export class SensitiveDataInterceptor implements NestInterceptor {
  // 需要移除的敏感字段列表
  private readonly sensitiveFields = [
    'password',
    'twoFactorSecret',
    'resetToken',
    'apiSecret',
    'privateKey',
    'accessToken',
    'refreshToken',
  ];

  // 需要部分脱敏的字段（显示部分信息）
  private readonly partialMaskFields = new Map<string, (value: string) => string>([
    ['phone', (value: string) => this.maskPhone(value)],
    ['email', (value: string) => this.maskEmail(value)],
    ['idCard', (value: string) => this.maskIdCard(value)],
  ]);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => this.removeSensitiveData(data))
    );
  }

  /**
   * 递归移除敏感数据
   */
  private removeSensitiveData(data: any): any {
    // 处理 null 和 undefined
    if (data === null || data === undefined) {
      return data;
    }

    // 处理数组
    if (Array.isArray(data)) {
      return data.map(item => this.removeSensitiveData(item));
    }

    // 处理对象
    if (data && typeof data === 'object') {
      const sanitized: any = {};

      for (const key of Object.keys(data)) {
        // 完全移除敏感字段
        if (this.sensitiveFields.includes(key)) {
          continue; // 跳过敏感字段
        }

        // 部分脱敏字段
        if (this.partialMaskFields.has(key) && typeof data[key] === 'string') {
          const maskFunction = this.partialMaskFields.get(key);
          sanitized[key] = maskFunction ? maskFunction(data[key]) : data[key];
        } else {
          // 递归处理嵌套对象
          sanitized[key] = this.removeSensitiveData(data[key]);
        }
      }

      return sanitized;
    }

    // 原始类型直接返回
    return data;
  }

  /**
   * 脱敏手机号：保留前3位和后4位
   * 例如：13812345678 -> 138****5678
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) {
      return phone;
    }
    return phone.slice(0, 3) + '****' + phone.slice(-4);
  }

  /**
   * 脱敏邮箱：保留用户名首字符和域名
   * 例如：john.doe@example.com -> j****@example.com
   */
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return email;
    }

    const [username, domain] = email.split('@');
    if (username.length <= 1) {
      return email;
    }

    return username[0] + '****' + '@' + domain;
  }

  /**
   * 脱敏身份证号：保留前4位和后4位
   * 例如：110101199001011234 -> 1101**********1234
   */
  private maskIdCard(idCard: string): string {
    if (!idCard || idCard.length < 8) {
      return idCard;
    }
    return idCard.slice(0, 4) + '*'.repeat(idCard.length - 8) + idCard.slice(-4);
  }
}
