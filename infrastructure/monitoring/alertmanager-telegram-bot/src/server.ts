/**
 * AlertManager to Telegram Bot Webhook Adapter
 * 将 AlertManager 告警转换为 Telegram 消息格式
 */

import express, { Request, Response } from 'express';
// @ts-ignore - telegraf types may not be available in workspace
import { Telegraf } from 'telegraf';
import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

// 配置日志
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

const app = express();
app.use(express.json());

// 环境变量
const PORT = process.env.PORT || 5002;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const PARSE_MODE = (process.env.PARSE_MODE || 'HTML') as 'HTML' | 'Markdown';

if (!TELEGRAM_BOT_TOKEN) {
  logger.warn('TELEGRAM_BOT_TOKEN not set, Telegram 功能将不可用');
}

if (!TELEGRAM_CHAT_ID) {
  logger.warn('TELEGRAM_CHAT_ID not set, Telegram 功能将不可用');
}

// 初始化 Telegram Bot
let bot: Telegraf | null = null;
if (TELEGRAM_BOT_TOKEN) {
  bot = new Telegraf(TELEGRAM_BOT_TOKEN);
  logger.info('Telegram Bot initialized');
}

// 获取 Chat ID 列表
const getChatIds = (): string[] => {
  return TELEGRAM_CHAT_ID.split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
};

// AlertManager Webhook 数据类型
interface Alert {
  status: 'firing' | 'resolved';
  labels: {
    alertname: string;
    severity?: string;
    service?: string;
    instance?: string;
    cluster?: string;
    [key: string]: string | undefined;
  };
  annotations: {
    summary?: string;
    description?: string;
    value?: string;
    threshold?: string;
    [key: string]: string | undefined;
  };
  startsAt: string;
  endsAt: string;
  generatorURL: string;
}

interface WebhookData {
  version: string;
  groupKey: string;
  truncatedAlerts: number;
  status: 'firing' | 'resolved';
  receiver: string;
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
  alerts: Alert[];
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 格式化告警消息为 Telegram HTML
 */
function formatTelegramMessage(data: WebhookData): { text: string; buttons: any } {
  const { status, groupLabels, alerts } = data;

  // 确定消息图标和标题
  const isResolved = status === 'resolved';
  const severity = groupLabels.severity || 'warning';

  let emoji = '⚠️';
  let title = '警告告警';

  if (isResolved) {
    emoji = '✅';
    title = '告警已恢复';
  } else if (severity === 'critical') {
    emoji = '🚨';
    title = '严重告警';
  }

  // 构建消息内容
  const alertName = escapeHtml(groupLabels.alertname || '未知告警');
  const service = escapeHtml(groupLabels.service || groupLabels.job || '未知服务');
  const cluster = escapeHtml(groupLabels.cluster || 'default');
  const alertCount = alerts.length;

  let message = `${emoji} <b>${title}</b>\n\n`;
  message += `<b>告警名称</b>: ${alertName}\n`;
  message += `<b>服务</b>: ${service}\n`;
  message += `<b>集群</b>: ${cluster}\n`;
  message += `<b>状态</b>: ${status.toUpperCase()}\n`;
  message += `<b>数量</b>: ${alertCount} 个实例\n`;

  // 添加告警详情
  const maxAlertsToShow = 5;
  alerts.slice(0, maxAlertsToShow).forEach((alert, index) => {
    message += `\n${'─'.repeat(20)}\n`;
    message += `📍 <b>实例 ${index + 1}</b>\n`;

    const instance = escapeHtml(alert.labels.instance || '未知实例');
    message += `• ${instance}\n`;

    if (alert.annotations.summary) {
      message += `• ${escapeHtml(alert.annotations.summary)}\n`;
    }

    if (alert.annotations.description) {
      const desc = escapeHtml(alert.annotations.description);
      // 限制描述长度
      const maxDescLength = 200;
      const truncatedDesc = desc.length > maxDescLength
        ? desc.substring(0, maxDescLength) + '...'
        : desc;
      message += `• ${truncatedDesc}\n`;
    }

    const startsAt = new Date(alert.startsAt).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });
    message += `• <b>开始时间</b>: ${startsAt}\n`;

    if (alert.annotations.value) {
      message += `• <b>当前值</b>: ${escapeHtml(alert.annotations.value)}\n`;
    }

    if (alert.annotations.threshold) {
      message += `• <b>阈值</b>: ${escapeHtml(alert.annotations.threshold)}\n`;
    }
  });

  // 如果告警数量超过限制，显示提示
  if (alertCount > maxAlertsToShow) {
    message += `\n<i>...还有 ${alertCount - maxAlertsToShow} 个告警未显示</i>\n`;
  }

  // 检查消息长度（Telegram 限制 4096 字符）
  if (message.length > 4000) {
    message = message.substring(0, 3900) + '\n\n<i>[消息过长已截断]</i>';
  }

  // 构建 Inline Keyboard 按钮
  const buttons = {
    inline_keyboard: [
      [
        {
          text: '🔍 查看 AlertManager',
          url: data.externalURL,
        },
      ],
    ],
  };

  // 添加 Prometheus 按钮（如果有 generatorURL）
  if (alerts[0]?.generatorURL) {
    buttons.inline_keyboard.push([
      {
        text: '📊 查看 Prometheus',
        url: alerts[0].generatorURL,
      },
    ]);
  }

  return { text: message, buttons };
}

/**
 * 发送消息到 Telegram
 */
async function sendToTelegram(message: string, buttons: any): Promise<void> {
  if (!bot) {
    throw new Error('Telegram Bot not initialized');
  }

  const chatIds = getChatIds();
  if (chatIds.length === 0) {
    throw new Error('No chat IDs configured');
  }

  logger.info({ chatIds, messageLength: message.length }, 'Sending message to Telegram...');

  // 发送到所有配置的 Chat ID
  const sendPromises = chatIds.map(async (chatId) => {
    try {
      await bot!.telegram.sendMessage(chatId, message, {
        parse_mode: PARSE_MODE,
        reply_markup: buttons,
        disable_web_page_preview: true,
      } as any);
      logger.info({ chatId }, 'Message sent successfully');
    } catch (error: any) {
      logger.error({ chatId, error: error.message }, 'Failed to send message');
      throw error;
    }
  });

  await Promise.all(sendPromises);
}

// 健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'alertmanager-telegram-bot',
    version: '1.0.0',
    botConfigured: !!TELEGRAM_BOT_TOKEN,
    chatIdsConfigured: getChatIds().length,
  });
});

// AlertManager Webhook 端点
app.post('/telegram-webhook', async (req: Request, res: Response) => {
  try {
    const webhookData: WebhookData = req.body;

    logger.info(
      {
        receiver: webhookData.receiver,
        status: webhookData.status,
        alertCount: webhookData.alerts.length,
      },
      'Received AlertManager webhook'
    );

    // 格式化消息
    const { text, buttons } = formatTelegramMessage(webhookData);

    // 发送到 Telegram
    await sendToTelegram(text, buttons);

    res.json({ success: true, message: 'Alert sent to Telegram' });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'Failed to process webhook');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 测试端点 - 发送测试消息
app.post('/test', async (req: Request, res: Response) => {
  try {
    const testMessage = `
🧪 <b>测试消息</b>

这是一条来自 AlertManager Telegram Bot 适配器的测试消息。

<b>时间</b>: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
<b>服务</b>: alertmanager-telegram-bot
<b>状态</b>: ✅ 正常运行

<i>如果您收到此消息，说明 Telegram 通知配置成功！</i>
    `.trim();

    const buttons = {
      inline_keyboard: [
        [
          {
            text: '✅ 配置成功',
            callback_data: 'test_success',
          },
        ],
      ],
    };

    await sendToTelegram(testMessage, buttons);

    res.json({ success: true, message: 'Test message sent to Telegram' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to send test message');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 获取 Bot 信息端点（用于验证 Token）
app.get('/bot-info', async (req: Request, res: Response) => {
  try {
    if (!bot) {
      return res.status(400).json({
        success: false,
        error: 'Telegram Bot not initialized',
      });
    }

    const botInfo = await bot.telegram.getMe();

    res.json({
      success: true,
      bot: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name,
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages,
      },
      chatIds: getChatIds(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get bot info');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`AlertManager Telegram Bot adapter listening on port ${PORT}`);
  logger.info(`Telegram Bot Token: ${TELEGRAM_BOT_TOKEN ? '已配置' : '未配置'}`);
  logger.info(`Chat IDs configured: ${getChatIds().length}`);

  if (bot && TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    // 验证 Bot Token
    bot.telegram
      .getMe()
      .then((botInfo: any) => {
        logger.info(
          {
            id: botInfo.id,
            username: botInfo.username,
            first_name: botInfo.first_name,
          },
          'Telegram Bot verified successfully'
        );
      })
      .catch((error: any) => {
        logger.error({ error: error.message }, 'Failed to verify Telegram Bot');
      });
  }
});
