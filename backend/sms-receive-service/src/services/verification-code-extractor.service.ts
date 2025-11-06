import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../health/metrics.service';
import { trace, SpanStatusCode } from '@opentelemetry/api';

/**
 * 验证码提取结果
 */
export interface VerificationCodeResult {
  code: string;
  confidence: number; // 0-100 置信度
  patternType: string; // 识别使用的模式类型
  extractedFrom: string; // 提取来源（完整消息或部分）
}

/**
 * 验证码模式配置
 */
interface CodePattern {
  name: string;
  regex: RegExp;
  priority: number; // 优先级，数字越大越优先
  confidence: number; // 基础置信度
  description: string;
}

/**
 * 验证码提取服务
 *
 * 功能：
 * 1. 多模式识别 - 支持各种常见的验证码格式
 * 2. 智能提取 - 自动识别并提取验证码
 * 3. 置信度评分 - 对提取结果进行可信度评估
 * 4. 性能优化 - 缓存和快速匹配
 */
@Injectable()
export class VerificationCodeExtractorService {
  private readonly logger = new Logger(VerificationCodeExtractorService.name);

  // 验证码识别模式（按优先级排序）
  private readonly patterns: CodePattern[] = [
    // 1. 明确标注的验证码格式
    {
      name: 'explicit_code',
      regex: /(?:code|código|kode|код|代码|驗證碼|验证码)[:\s]*([A-Z0-9]{4,8})/i,
      priority: 100,
      confidence: 95,
      description: 'Explicitly labeled verification code',
    },
    {
      name: 'verification_code',
      regex: /(?:verification|verify|confirmation|confirm)[:\s]+([A-Z0-9]{4,8})/i,
      priority: 95,
      confidence: 95,
      description: 'Verification/Confirmation code',
    },

    // 2. OTP 格式
    {
      name: 'otp',
      regex: /(?:OTP|one[- ]?time[- ]?password)[:\s]*([A-Z0-9]{4,8})/i,
      priority: 90,
      confidence: 95,
      description: 'One-Time Password',
    },

    // 3. 常见应用特定格式
    {
      name: 'telegram',
      regex: /(?:Telegram|TG)[:\s]*([A-Z0-9]{5})/i,
      priority: 85,
      confidence: 90,
      description: 'Telegram verification code',
    },
    {
      name: 'whatsapp',
      regex: /(?:WhatsApp|WA)[:\s]*([0-9]{6})/i,
      priority: 85,
      confidence: 90,
      description: 'WhatsApp verification code',
    },
    {
      name: 'twitter',
      regex: /(?:Twitter|X)[:\s]*([0-9]{6})/i,
      priority: 85,
      confidence: 90,
      description: 'Twitter/X verification code',
    },

    // 4. 纯数字验证码（最常见）
    {
      name: 'six_digit',
      regex: /\b([0-9]{6})\b/,
      priority: 70,
      confidence: 85,
      description: '6-digit numeric code',
    },
    {
      name: 'four_digit',
      regex: /\b([0-9]{4})\b/,
      priority: 65,
      confidence: 80,
      description: '4-digit numeric code',
    },
    {
      name: 'eight_digit',
      regex: /\b([0-9]{8})\b/,
      priority: 60,
      confidence: 75,
      description: '8-digit numeric code',
    },

    // 5. 字母数字混合
    {
      name: 'alphanumeric_6',
      regex: /\b([A-Z0-9]{6})\b/i,
      priority: 55,
      confidence: 70,
      description: '6-character alphanumeric code',
    },
    {
      name: 'alphanumeric_8',
      regex: /\b([A-Z0-9]{8})\b/i,
      priority: 50,
      confidence: 65,
      description: '8-character alphanumeric code',
    },

    // 6. 带分隔符的格式
    {
      name: 'hyphenated',
      regex: /\b([A-Z0-9]{3,4}-[A-Z0-9]{3,4})\b/i,
      priority: 45,
      confidence: 75,
      description: 'Hyphenated code (XXX-XXX)',
    },
    {
      name: 'spaced',
      regex: /\b([A-Z0-9]{3})\s+([A-Z0-9]{3})\b/i,
      priority: 40,
      confidence: 70,
      description: 'Spaced code (XXX XXX)',
    },
  ];

  private readonly tracer = trace.getTracer('sms-receive-service');

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
    this.logger.log(`Initialized with ${this.patterns.length} verification code patterns`);
  }

  /**
   * 从SMS消息中提取验证码
   * @param message SMS消息内容
   * @param serviceCode 服务代码（用于优化匹配）
   * @returns 验证码结果或null
   */
  async extractCode(
    message: string,
    serviceCode?: string,
  ): Promise<VerificationCodeResult | null> {
    return await this.tracer.startActiveSpan(
      'verification-code.extract',
      {
        attributes: {
          'service.code': serviceCode || 'unknown',
          'message.length': message.length,
        },
      },
      async (span) => {
        const startTime = Date.now();

        try {
      // 预处理消息
      const cleanedMessage = this.preprocessMessage(message);

      // 尝试所有模式匹配
      const matches: Array<VerificationCodeResult & { priority: number }> = [];

      for (const pattern of this.patterns) {
        const match = pattern.regex.exec(cleanedMessage);

        if (match) {
          const code = match[1] || (match[2] ? `${match[1]} ${match[2]}` : '');

          if (this.isValidCode(code)) {
            matches.push({
              code: code.trim(),
              confidence: this.calculateConfidence(pattern, code, cleanedMessage, serviceCode),
              patternType: pattern.name,
              extractedFrom: this.getContext(cleanedMessage, match.index, 30),
              priority: pattern.priority,
            });
          }
        }
      }

          // 如果没有匹配，返回null
          if (matches.length === 0) {
            this.logger.debug(`No verification code found in message: ${message.substring(0, 50)}...`);
            span.setStatus({ code: SpanStatusCode.OK });
            span.setAttribute('code.found', false);
            span.end();
            return null;
          }

      // 选择最佳匹配（优先级最高且置信度最高）
      matches.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // 优先级高的在前
        }
        return b.confidence - a.confidence; // 置信度高的在前
      });

      const bestMatch = matches[0];

      // 记录性能指标
      const durationMs = Date.now() - startTime;
      this.metricsService.recordVerificationCodeExtractionTime(durationMs / 1000);
      this.metricsService.recordVerificationCodeExtracted(
        serviceCode || 'unknown',
        bestMatch.patternType,
      );

          this.logger.log(
            `Extracted code: ${bestMatch.code} (pattern=${bestMatch.patternType}, confidence=${bestMatch.confidence}%, time=${durationMs}ms)`,
          );

          // 添加追踪属性
          span.setAttributes({
            'code.found': true,
            'code.value': bestMatch.code,
            'code.pattern': bestMatch.patternType,
            'code.confidence': bestMatch.confidence,
            'extraction.duration_ms': durationMs,
          });
          span.setStatus({ code: SpanStatusCode.OK });

          // 移除priority属性
          const { priority, ...result } = bestMatch;
          return result;
        } catch (error) {
          this.logger.error(`Failed to extract verification code: ${error.message}`, error.stack);
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          return null;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * 批量提取验证码
   */
  async extractCodesFromMessages(
    messages: Array<{ id: string; content: string; serviceCode?: string }>,
  ): Promise<Map<string, VerificationCodeResult | null>> {
    const results = new Map<string, VerificationCodeResult | null>();

    for (const msg of messages) {
      const code = await this.extractCode(msg.content, msg.serviceCode);
      results.set(msg.id, code);
    }

    return results;
  }

  /**
   * 预处理消息
   */
  private preprocessMessage(message: string): string {
    return (
      message
        // 统一换行符
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // 移除多余空格
        .replace(/\s+/g, ' ')
        // 移除特殊字符（保留字母数字和常见标点）
        .replace(/[^\w\s\-:]/gi, ' ')
        .trim()
    );
  }

  /**
   * 验证码有效性检查
   */
  private isValidCode(code: string): boolean {
    if (!code || code.length < 4 || code.length > 10) {
      return false;
    }

    // 排除明显不是验证码的模式
    const invalidPatterns = [
      /^0+$/, // 全是0
      /^1+$/, // 全是1
      /^(123456|654321|111111|000000)$/, // 常见弱密码
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(code)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    pattern: CodePattern,
    code: string,
    message: string,
    serviceCode?: string,
  ): number {
    let confidence = pattern.confidence;

    // 基于服务类型的加权
    if (serviceCode && pattern.name.toLowerCase().includes(serviceCode.toLowerCase())) {
      confidence += 5; // 匹配服务类型，增加5分
    }

    // 基于上下文的加权
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes('verify') ||
      lowerMessage.includes('verification') ||
      lowerMessage.includes('confirm')
    ) {
      confidence += 3;
    }

    // 基于代码长度的加权
    if (code.length === 6) {
      confidence += 2; // 6位是最常见的
    }

    // 置信度上限100
    return Math.min(confidence, 100);
  }

  /**
   * 获取上下文（用于调试）
   */
  private getContext(text: string, position: number, contextLength: number): string {
    const start = Math.max(0, position - contextLength);
    const end = Math.min(text.length, position + contextLength);
    return text.substring(start, end).trim();
  }

  /**
   * 获取所有支持的模式
   */
  getSupportedPatterns(): Array<{ name: string; description: string; priority: number }> {
    return this.patterns.map(p => ({
      name: p.name,
      description: p.description,
      priority: p.priority,
    }));
  }

  /**
   * 测试特定模式
   */
  testPattern(message: string, patternName: string): VerificationCodeResult | null {
    const pattern = this.patterns.find(p => p.name === patternName);

    if (!pattern) {
      this.logger.warn(`Pattern ${patternName} not found`);
      return null;
    }

    const cleanedMessage = this.preprocessMessage(message);
    const match = pattern.regex.exec(cleanedMessage);

    if (!match) {
      return null;
    }

    const code = match[1] || (match[2] ? `${match[1]} ${match[2]}` : '');

    if (!this.isValidCode(code)) {
      return null;
    }

    return {
      code: code.trim(),
      confidence: pattern.confidence,
      patternType: pattern.name,
      extractedFrom: this.getContext(cleanedMessage, match.index, 30),
    };
  }
}
