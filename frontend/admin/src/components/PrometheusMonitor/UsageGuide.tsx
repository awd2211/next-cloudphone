import React from 'react';
import { Card, Typography } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';

const { Title, Paragraph } = Typography;

export const UsageGuide: React.FC = () => {
  return (
    <Card title="使用说明" bordered={false}>
      <Title level={5}>如何启动监控系统</Title>
      <Paragraph>
        <pre style={{ background: NEUTRAL_LIGHT.bg.layout, padding: 16, borderRadius: 4 }}>
          {`# 启动监控栈
cd infrastructure/monitoring
./start-monitoring.sh

# 访问Grafana
# URL: http://localhost:3000
# 默认账号: admin
# 默认密码: admin

# 访问Prometheus
# URL: http://localhost:9090`}
        </pre>
      </Paragraph>

      <Title level={5}>可用的监控指标</Title>
      <ul>
        <li>
          <strong>HTTP指标:</strong> 请求数、响应时间、错误率、状态码分布
        </li>
        <li>
          <strong>系统指标:</strong> CPU使用率、内存使用、磁盘IO、网络流量
        </li>
        <li>
          <strong>应用指标:</strong> 设备数量、活跃用户数、队列长度
        </li>
        <li>
          <strong>数据库指标:</strong> 连接数、查询性能、缓存命中率
        </li>
        <li>
          <strong>业务指标:</strong> 订单量、支付成功率、设备创建速率
        </li>
      </ul>

      <Title level={5}>告警配置</Title>
      <Paragraph>可以在Grafana中配置告警规则，当指标超过阈值时通过邮件、Webhook等方式通知：</Paragraph>
      <ul>
        <li>CPU使用率超过80%</li>
        <li>内存使用率超过90%</li>
        <li>API错误率超过1%</li>
        <li>响应时间超过1秒</li>
        <li>数据库连接池耗尽</li>
      </ul>
    </Card>
  );
};
