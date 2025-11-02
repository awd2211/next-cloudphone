import React from 'react';
import { Row, Col, Typography, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface PageHeaderProps {
  onCreate: () => void;
}

/**
 * 页面头部组件
 *
 * 优化点:
 * - 使用 React.memo 优化
 * - 简洁的标题 + 操作按钮布局
 */
export const PageHeader: React.FC<PageHeaderProps> = React.memo(({ onCreate }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2} style={{ marginBottom: 8 }}>
            设备模板管理
          </Title>
          <Text type="secondary">
            使用模板快速创建设备，提高运营效率
          </Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={onCreate}
          >
            创建自定义模板
          </Button>
        </Col>
      </Row>
    </div>
  );
});

PageHeader.displayName = 'PageHeader';
