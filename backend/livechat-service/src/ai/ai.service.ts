import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface AiResponse {
  content: string;
  confidence: number;
  model: string;
  suggestedActions?: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly enabled: boolean;
  private readonly provider: string;
  private openai: OpenAI | null = null;

  // 系统提示词
  private readonly systemPrompt = `你是云手机平台的智能客服助手。你的职责是：
1. 帮助用户解决云手机使用过程中的问题
2. 回答关于平台功能、定价、套餐的问题
3. 协助处理设备相关的技术问题
4. 在无法解决时，礼貌地告知用户将转接人工客服

请保持专业、友好、简洁的回答风格。如果不确定答案，请坦诚告知。`;

  constructor(private configService: ConfigService) {
    this.enabled = configService.get('AI_ENABLED', true);
    this.provider = configService.get('AI_PROVIDER', 'openai');

    if (this.enabled && this.provider === 'openai') {
      const apiKey = configService.get('OPENAI_API_KEY');
      if (apiKey) {
        this.openai = new OpenAI({
          apiKey,
          baseURL: configService.get('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
        });
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled && this.openai !== null;
  }

  async generateResponse(
    userMessage: string,
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[],
    context?: Record<string, any>,
  ): Promise<AiResponse> {
    if (!this.isEnabled()) {
      return {
        content: '抱歉，AI 助手暂时不可用，正在为您转接人工客服...',
        confidence: 0,
        model: 'disabled',
      };
    }

    try {
      const model = this.configService.get('OPENAI_MODEL', 'gpt-4o-mini');

      // 构建消息
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: this.buildSystemPrompt(context) },
      ];

      // 添加历史消息
      if (conversationHistory) {
        messages.push(...conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })));
      }

      // 添加当前消息
      messages.push({ role: 'user', content: userMessage });

      const completion = await this.openai!.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || '';
      const confidence = this.calculateConfidence(content);

      return {
        content,
        confidence,
        model,
        suggestedActions: this.extractSuggestedActions(content),
      };

    } catch (error) {
      this.logger.error(`AI generation failed: ${error.message}`);
      return {
        content: '抱歉，AI 助手遇到了问题，正在为您转接人工客服...',
        confidence: 0,
        model: 'error',
      };
    }
  }

  async classifyIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: Record<string, any>;
  }> {
    if (!this.isEnabled()) {
      return { intent: 'unknown', confidence: 0, entities: {} };
    }

    try {
      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `分析用户消息的意图。返回JSON格式：
{
  "intent": "意图类别（如：device_issue, billing_question, feature_inquiry, complaint, greeting, other）",
  "confidence": 0.0-1.0 的置信度,
  "entities": { "提取的关键实体" }
}`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      return {
        intent: result.intent || 'unknown',
        confidence: result.confidence || 0,
        entities: result.entities || {},
      };

    } catch (error) {
      this.logger.error(`Intent classification failed: ${error.message}`);
      return { intent: 'unknown', confidence: 0, entities: {} };
    }
  }

  async suggestCannedResponse(message: string, cannedResponses: string[]): Promise<{
    bestMatch: string | null;
    confidence: number;
  }> {
    if (!this.isEnabled() || cannedResponses.length === 0) {
      return { bestMatch: null, confidence: 0 };
    }

    try {
      const completion = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `从以下预设回复中选择最适合回答用户问题的一个：
${cannedResponses.map((r, i) => `${i + 1}. ${r}`).join('\n')}

返回JSON格式：{"index": 选择的序号(1-based), "confidence": 0.0-1.0}
如果没有合适的回复，返回 {"index": 0, "confidence": 0}`,
          },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      const index = result.index || 0;

      return {
        bestMatch: index > 0 && index <= cannedResponses.length ? cannedResponses[index - 1] : null,
        confidence: result.confidence || 0,
      };

    } catch (error) {
      this.logger.error(`Canned response suggestion failed: ${error.message}`);
      return { bestMatch: null, confidence: 0 };
    }
  }

  private buildSystemPrompt(context?: Record<string, any>): string {
    let prompt = this.systemPrompt;

    if (context?.deviceInfo) {
      prompt += `\n\n当前设备信息：${JSON.stringify(context.deviceInfo)}`;
    }

    if (context?.userInfo) {
      prompt += `\n\n用户信息：套餐=${context.userInfo.plan}，注册时间=${context.userInfo.registeredAt}`;
    }

    return prompt;
  }

  private calculateConfidence(content: string): number {
    // 简单的置信度计算
    const uncertainPhrases = ['不确定', '可能', '也许', '建议联系', '转接', '人工'];
    const uncertainCount = uncertainPhrases.filter((p) => content.includes(p)).length;

    return Math.max(0, 1 - uncertainCount * 0.2);
  }

  private extractSuggestedActions(content: string): string[] {
    const actions: string[] = [];

    if (content.includes('转接') || content.includes('人工')) {
      actions.push('transfer_to_agent');
    }

    if (content.includes('设备') || content.includes('重启')) {
      actions.push('device_assist');
    }

    if (content.includes('套餐') || content.includes('充值')) {
      actions.push('billing_redirect');
    }

    return actions;
  }
}
