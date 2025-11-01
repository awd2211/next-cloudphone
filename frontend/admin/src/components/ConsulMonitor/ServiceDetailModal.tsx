import { memo } from 'react';
import { Modal, Button, Descriptions, Typography, Table, Tag, Space } from 'antd';
import type { ServiceHealth } from './types';
import { getStatusTag } from './utils';

const { Text, Title } = Typography;

export interface ServiceDetailModalProps {
  visible: boolean;
  service: ServiceHealth | null;
  onClose: () => void;
}

/**
 * 服务详情模态框组件
 */
export const ServiceDetailModal = memo<ServiceDetailModalProps>(({ visible, service, onClose }) => {
  if (!service) return null;

  return (
    <Modal
      title={`服务详情: ${service.service}`}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={800}
    >
      <div>
        <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="服务名称" span={2}>
            {service.service}
          </Descriptions.Item>
          <Descriptions.Item label="实例总数">{service.instances.length}</Descriptions.Item>
          <Descriptions.Item label="健康实例">
            <Text style={{ color: '#52c41a' }}>{service.healthyCount}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="异常实例">
            <Text style={{ color: service.unhealthyCount > 0 ? '#ff4d4f' : '#999' }}>
              {service.unhealthyCount}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="整体状态">
            {getStatusTag(
              service.healthyCount === 0
                ? 'critical'
                : service.unhealthyCount > 0
                  ? 'warning'
                  : 'passing',
            )}
          </Descriptions.Item>
        </Descriptions>

        <Title level={5}>实例列表</Title>
        <Table
          columns={[
            {
              title: '实例ID',
              dataIndex: 'id',
              key: 'id',
              width: 200,
            },
            {
              title: '地址',
              key: 'address',
              render: (_, record) => `${record.address}:${record.port}`,
            },
            {
              title: '状态',
              dataIndex: 'status',
              key: 'status',
              width: 100,
              render: (status: string) => getStatusTag(status),
            },
            {
              title: '标签',
              dataIndex: 'tags',
              key: 'tags',
              render: (tags: string[]) => (
                <Space wrap>
                  {tags.map((tag, index) => (
                    <Tag key={index}>{tag}</Tag>
                  ))}
                </Space>
              ),
            },
          ]}
          dataSource={service.instances}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </div>
    </Modal>
  );
});

ServiceDetailModal.displayName = 'ServiceDetailModal';
