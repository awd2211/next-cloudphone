import React, { memo } from 'react';
import { Modal, Button, Card, Space, Row, Col, Statistic, Tag, Alert, Typography } from 'antd';
import { LineChartOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ApiKey } from '@/hooks/useApiKeys';
import { API_SCOPES } from '@/hooks/useApiKeys';

const { Text } = Typography;

interface StatsModalProps {
  visible: boolean;
  selectedApiKey: ApiKey | null;
  onClose: () => void;
}

export const StatsModal = memo<StatsModalProps>(({ visible, selectedApiKey, onClose }) => {
  return (
    <Modal
      title="API Key 使用统计"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={700}
    >
      {selectedApiKey && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Text strong>密钥名称:</Text>
              <Text>{selectedApiKey.name}</Text>
              <Text strong style={{ marginTop: 8 }}>
                描述:
              </Text>
              <Text>{selectedApiKey.description || '-'}</Text>
              <Text strong style={{ marginTop: 8 }}>
                权限范围:
              </Text>
              <Space wrap>
                {selectedApiKey.scope.map((scope) => {
                  const scopeInfo = API_SCOPES.find((s) => s.value === scope);
                  return (
                    <Tag key={scope} color="blue">
                      {scopeInfo?.label}
                    </Tag>
                  );
                })}
              </Space>
            </Space>
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card>
                <Statistic
                  title="总请求次数"
                  value={selectedApiKey.requestCount}
                  prefix={<LineChartOutlined />}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic
                  title="创建时间"
                  value={dayjs(selectedApiKey.createdAt).format('YYYY-MM-DD')}
                  prefix={<ClockCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Alert
            message="详细使用统计"
            description="查看过去30天的详细请求日志和统计图表，请访问 "使用记录" 页面。"
            type="info"
            showIcon
          />
        </div>
      )}
    </Modal>
  );
});

StatsModal.displayName = 'StatsModal';
