import { useState } from 'react';
import { Card, Row, Col, Tabs, Alert, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  BarChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const PrometheusMonitor = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Grafana仪表板配置
  const grafanaDashboards = [
    {
      id: 'device-overview',
      title: '设备概览',
      url: 'http://localhost:3000/d/device-overview',
      iframeSrc:
        'http://localhost:3000/d-solo/device-overview?orgId=1&refresh=5s&theme=light&panelId=1',
      description: '设备运行状态、资源使用情况总览',
    },
    {
      id: 'service-metrics',
      title: '服务指标',
      url: 'http://localhost:3000/d/service-metrics',
      iframeSrc:
        'http://localhost:3000/d-solo/service-metrics?orgId=1&refresh=5s&theme=light&panelId=1',
      description: 'API请求量、响应时间、错误率等服务指标',
    },
    {
      id: 'resource-usage',
      title: '资源使用',
      url: 'http://localhost:3000/d/resource-usage',
      iframeSrc:
        'http://localhost:3000/d-solo/resource-usage?orgId=1&refresh=5s&theme=light&panelId=1',
      description: 'CPU、内存、磁盘、网络等资源使用趋势',
    },
    {
      id: 'database-metrics',
      title: '数据库监控',
      url: 'http://localhost:3000/d/database-metrics',
      iframeSrc:
        'http://localhost:3000/d-solo/database-metrics?orgId=1&refresh=5s&theme=light&panelId=1',
      description: 'PostgreSQL、Redis连接数、查询性能等',
    },
  ];

  const handleOpenGrafana = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <BarChartOutlined /> Prometheus & Grafana 监控
      </Title>

      <Alert
        message="监控系统说明"
        description={
          <div>
            <p>本系统使用Prometheus采集指标，Grafana进行可视化展示</p>
            <ul style={{ marginBottom: 0 }}>
              <li>Prometheus: http://localhost:9090</li>
              <li>Grafana: http://localhost:3000 (默认账号: admin/admin)</li>
              <li>数据自动刷新周期: 5秒</li>
            </ul>
          </div>
        }
        type="info"
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      {/* 快速访问 */}
      <Card title="快速访问" style={{ marginBottom: 24 }}>
        <Space size="large" wrap>
          <Button
            type="primary"
            icon={<DashboardOutlined />}
            onClick={() => window.open('http://localhost:3000', '_blank')}
          >
            打开 Grafana
          </Button>
          <Button
            icon={<LineChartOutlined />}
            onClick={() => window.open('http://localhost:9090', '_blank')}
          >
            打开 Prometheus
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </Space>
      </Card>

      {/* 仪表板列表 */}
      <Card title="预置仪表板">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {grafanaDashboards.map((dashboard) => (
            <TabPane tab={dashboard.title} key={dashboard.id}>
              <div>
                <Paragraph type="secondary">{dashboard.description}</Paragraph>
                <Button
                  type="link"
                  onClick={() => handleOpenGrafana(dashboard.url)}
                  style={{ marginBottom: 16 }}
                >
                  在新窗口中打开完整仪表板 →
                </Button>

                <div
                  style={{
                    background: '#f5f5f5',
                    padding: 16,
                    borderRadius: 4,
                    textAlign: 'center',
                  }}
                >
                  {/* Grafana iframe 嵌入 */}
                  <iframe
                    src={dashboard.iframeSrc}
                    width="100%"
                    height="400"
                    frameBorder="0"
                    title={dashboard.title}
                    style={{ border: 'none' }}
                    onError={() => {
                      console.error('Grafana加载失败');
                    }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    提示: 如果仪表板未显示，请确保Grafana服务正在运行
                  </Text>
                </div>
              </div>
            </TabPane>
          ))}
        </Tabs>
      </Card>

      {/* 关键指标卡片 */}
      <Title level={4} style={{ marginTop: 24 }}>
        关键指标快速查看
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="系统请求量（QPS）" bordered={false}>
            <iframe
              src="http://localhost:3000/d-solo/system-overview?orgId=1&refresh=5s&theme=light&panelId=2"
              width="100%"
              height="200"
              frameBorder="0"
              title="QPS"
              style={{ border: 'none' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="平均响应时间" bordered={false}>
            <iframe
              src="http://localhost:3000/d-solo/system-overview?orgId=1&refresh=5s&theme=light&panelId=3"
              width="100%"
              height="200"
              frameBorder="0"
              title="Response Time"
              style={{ border: 'none' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="CPU使用率" bordered={false}>
            <iframe
              src="http://localhost:3000/d-solo/resource-usage?orgId=1&refresh=5s&theme=light&panelId=4"
              width="100%"
              height="200"
              frameBorder="0"
              title="CPU Usage"
              style={{ border: 'none' }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="内存使用率" bordered={false}>
            <iframe
              src="http://localhost:3000/d-solo/resource-usage?orgId=1&refresh=5s&theme=light&panelId=5"
              width="100%"
              height="200"
              frameBorder="0"
              title="Memory Usage"
              style={{ border: 'none' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 使用说明 */}
      <Card title="使用说明" style={{ marginTop: 24 }} bordered={false}>
        <Title level={5}>如何启动监控系统</Title>
        <Paragraph>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
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
        <Paragraph>
          可以在Grafana中配置告警规则，当指标超过阈值时通过邮件、Webhook等方式通知：
        </Paragraph>
        <ul>
          <li>CPU使用率超过80%</li>
          <li>内存使用率超过90%</li>
          <li>API错误率超过1%</li>
          <li>响应时间超过1秒</li>
          <li>数据库连接池耗尽</li>
        </ul>
      </Card>
    </div>
  );
};

export default PrometheusMonitor;
