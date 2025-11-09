import * as amqp from 'amqplib';

/**
 * 创建测试 RabbitMQ 连接
 */
export async function createTestRabbitMQConnection(): Promise<amqp.Connection> {
  const url = process.env.RABBITMQ_URL || 'amqp://test_admin:test_password@localhost:5673/cloudphone_test';
  return await amqp.connect(url);
}

/**
 * 创建测试通道
 */
export async function createTestChannel(connection: amqp.Connection): Promise<amqp.Channel> {
  return await connection.createChannel();
}

/**
 * 发布测试事件
 */
export async function publishTestEvent(
  channel: amqp.Channel,
  exchange: string,
  routingKey: string,
  payload: any,
): Promise<void> {
  const message = Buffer.from(JSON.stringify(payload));
  channel.publish(exchange, routingKey, message, {
    persistent: true,
    contentType: 'application/json',
  });
}

/**
 * 清理测试队列
 */
export async function cleanTestQueues(channel: amqp.Channel, queueNames: string[]): Promise<void> {
  for (const queueName of queueNames) {
    try {
      await channel.purgeQueue(queueName);
    } catch (error) {
      // 队列不存在时忽略错误
    }
  }
}

/**
 * 关闭 RabbitMQ 连接
 */
export async function closeRabbitMQ(connection: amqp.Connection): Promise<void> {
  if (connection) {
    await connection.close();
  }
}

/**
 * 等待消息被消费（用于异步测试）
 */
export async function waitForMessageProcessing(delayMs = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * 创建测试交换机和队列
 */
export async function setupTestExchangeAndQueue(
  channel: amqp.Channel,
  exchange: string,
  queueName: string,
  routingKey: string,
): Promise<void> {
  // 声明交换机
  await channel.assertExchange(exchange, 'topic', { durable: true });

  // 声明队列
  await channel.assertQueue(queueName, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': 'cloudphone.notifications.dlx',
    },
  });

  // 绑定队列到交换机
  await channel.bindQueue(queueName, exchange, routingKey);
}
