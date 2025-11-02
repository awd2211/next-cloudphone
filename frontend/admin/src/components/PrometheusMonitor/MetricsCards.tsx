import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import { KEY_METRICS } from '@/config/prometheus';

const { Title } = Typography;

export const MetricsCards: React.FC = () => {
  return (
    <>
      <Title level={4} style={{ marginTop: 24 }}>
        关键指标快速查看
      </Title>
      <Row gutter={[16, 16]}>
        {KEY_METRICS.map((metric, index) => (
          <Col xs={24} md={12} key={index}>
            <Card title={metric.title} bordered={false}>
              <iframe
                src={metric.iframeSrc}
                width="100%"
                height="200"
                frameBorder="0"
                title={metric.title}
                style={{ border: 'none' }}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};
