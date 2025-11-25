/**
 * AlertManager to Lark Webhook Adapter
 * 将 AlertManager 告警转换为飞书消息格式
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
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
const PORT = process.env.PORT || 30011;
const LARK_WEBHOOK_URL = process.env.LARK_WEBHOOK_URL || '';
const LARK_SECRET = process.env.LARK_SECRET || '';

if (!LARK_WEBHOOK_URL) {
  logger.warn('LARK_WEBHOOK_URL not set, webhook功能将不可用');
}

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
 * 生成飞书消息签名
 */
function generateSign(timestamp: string, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  return crypto.createHmac('sha256', stringToSign).digest('base64');
}

/**
 * 格式化告警消息为飞书卡片
 */
function formatLarkMessage(data: WebhookData): any {
  const { status, groupLabels, alerts } = data;

  // 确定卡片颜色和图标
  const isResolved = status === 'resolved';
  const severity = groupLabels.severity || 'warning';

  let headerColor: 'red' | 'orange' | 'green' = 'orange';
  let emoji = '⚠️';

  if (isResolved) {
    headerColor = 'green';
    emoji = '✅';
  } else if (severity === 'critical') {
    headerColor = 'red';
    emoji = '🚨';
  }

  const title = isResolved
    ? `${emoji} 告警已恢复`
    : `${emoji} ${severity === 'critical' ? '严重告警' : '警告告警'}`;

  // 构建卡片元素
  const elements: any[] = [];

  // 告警摘要
  const alertCount = alerts.length;
  const alertName = groupLabels.alertname || '未知告警';
  const service = groupLabels.service || groupLabels.job || '未知服务';
  const cluster = groupLabels.cluster || 'default';

  elements.push({
    tag: 'div',
    text: {
      content: `**告警名称**: ${alertName}\n**服务**: ${service}\n**集群**: ${cluster}\n**数量**: ${alertCount} 个实例`,
      tag: 'lark_md',
    },
  });

  // 添加分隔线
  elements.push({
    tag: 'hr',
  });

  // 显示前 5 个告警详情
  const maxAlertsToShow = 5;
  alerts.slice(0, maxAlertsToShow).forEach((alert, index) => {
    const summary = alert.annotations.summary || '无描述';
    const instance = alert.labels.instance || '未知实例';
    const startsAt = new Date(alert.startsAt).toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
    });

    let alertContent = `**实例 ${index + 1}**: ${instance}\n`;
    alertContent += `**摘要**: ${summary}\n`;
    alertContent += `**开始时间**: ${startsAt}`;

    if (alert.annotations.description) {
      alertContent += `\n**详情**: ${alert.annotations.description}`;
    }

    if (alert.annotations.value) {
      alertContent += `\n**当前值**: ${alert.annotations.value}`;
    }

    elements.push({
      tag: 'div',
      text: {
        content: alertContent,
        tag: 'lark_md',
      },
    });

    // 添加分隔线（最后一个告警不添加）
    if (index < Math.min(alerts.length, maxAlertsToShow) - 1) {
      elements.push({
        tag: 'hr',
      });
    }
  });

  // 如果告警数量超过 5 个，显示提示
  if (alertCount > maxAlertsToShow) {
    elements.push({
      tag: 'div',
      text: {
        content: `*...还有 ${alertCount - maxAlertsToShow} 个告警未显示*`,
        tag: 'lark_md',
      },
    });
  }

  // 添加操作按钮
  elements.push({
    tag: 'action',
    actions: [
      {
        tag: 'button',
        text: {
          content: '查看 AlertManager',
          tag: 'plain_text',
        },
        type: 'primary',
        url: data.externalURL,
      },
      {
        tag: 'button',
        text: {
          content: '查看 Prometheus',
          tag: 'plain_text',
        },
        url: alerts[0]?.generatorURL || '',
      },
    ],
  });

  // 构建完整的飞书消息卡片
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: {
          content: title,
          tag: 'plain_text',
        },
        template: headerColor,
      },
      elements,
    },
  };
}

/**
 * 发送消息到飞书
 */
async function sendToLark(message: any): Promise<void> {
  if (!LARK_WEBHOOK_URL) {
    throw new Error('LARK_WEBHOOK_URL not configured');
  }

  // 添加签名（如果配置了 secret）
  let body = message;
  if (LARK_SECRET) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sign = generateSign(timestamp, LARK_SECRET);
    body = {
      ...message,
      timestamp,
      sign,
    };
  }

  logger.info('Sending message to Lark...');
  logger.debug({ message: body }, 'Lark message body');

  const response = await axios.post(LARK_WEBHOOK_URL, body, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  if (response.data.code !== 0) {
    throw new Error(`Lark API error: ${JSON.stringify(response.data)}`);
  }

  logger.info('Message sent successfully');
}

// 健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'alertmanager-lark-webhook',
    version: '1.0.0',
    larkConfigured: !!LARK_WEBHOOK_URL,
  });
});

// AlertManager Webhook 端点
app.post('/lark-webhook', async (req: Request, res: Response) => {
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
    const larkMessage = formatLarkMessage(webhookData);

    // 发送到飞书
    await sendToLark(larkMessage);

    res.json({ success: true, message: 'Alert sent to Lark' });
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
    const testMessage = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            content: '🧪 测试消息',
            tag: 'plain_text',
          },
          template: 'blue',
        },
        elements: [
          {
            tag: 'div',
            text: {
              content: '这是一条来自 AlertManager Lark Webhook 适配器的测试消息。',
              tag: 'lark_md',
            },
          },
          {
            tag: 'div',
            text: {
              content: `**时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
              tag: 'lark_md',
            },
          },
        ],
      },
    };

    await sendToLark(testMessage);

    res.json({ success: true, message: 'Test message sent to Lark' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to send test message');
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`AlertManager Lark Webhook adapter listening on port ${PORT}`);
  logger.info(`Lark Webhook URL: ${LARK_WEBHOOK_URL ? '已配置' : '未配置'}`);
  logger.info(`Lark Secret: ${LARK_SECRET ? '已配置' : '未配置'}`);
});
