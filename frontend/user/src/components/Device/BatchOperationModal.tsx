import React from 'react';
import { Modal, Progress, List, Tag, Space, Typography, Alert, theme } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { useToken } = theme;

export interface BatchOperationResult {
  deviceId: string;
  deviceName: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  errorMessage?: string;
}

interface BatchOperationModalProps {
  open: boolean;
  title: string;
  operationType: string;
  results: BatchOperationResult[];
  onClose: () => void;
}

/**
 * 批量操作进度模态框
 *
 * 功能：
 * 1. 显示批量操作进度
 * 2. 实时更新每个设备的操作状态
 * 3. 显示成功/失败统计
 * 4. 显示错误信息
 */
export const BatchOperationModal: React.FC<BatchOperationModalProps> = React.memo(
  ({ open, title, operationType, results, onClose }) => {
    const { token } = useToken();

    // 统计
    const total = results.length;
    const completed = results.filter(
      (r) => r.status === 'success' || r.status === 'failed'
    ).length;
    const success = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const processing = results.filter((r) => r.status === 'processing').length;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isCompleted = completed === total;

    // 获取状态图标和颜色
    const getStatusIcon = (status: BatchOperationResult['status']) => {
      switch (status) {
        case 'success':
          return <CheckCircleOutlined style={{ color: token.colorSuccess }} />;
        case 'failed':
          return <CloseCircleOutlined style={{ color: token.colorError }} />;
        case 'processing':
          return <LoadingOutlined style={{ color: token.colorPrimary }} />;
        default:
          return <InfoCircleOutlined style={{ color: token.colorBorder }} />;
      }
    };

    const getStatusTag = (status: BatchOperationResult['status']) => {
      switch (status) {
        case 'success':
          return <Tag color="success">成功</Tag>;
        case 'failed':
          return <Tag color="error">失败</Tag>;
        case 'processing':
          return <Tag color="processing">处理中</Tag>;
        default:
          return <Tag>等待中</Tag>;
      }
    };

    return (
      <Modal
        title={title}
        open={open}
        onCancel={onClose}
        footer={
          isCompleted
            ? [
                <Space key="stats" style={{ marginRight: 'auto' }}>
                  <Text type="success">成功: {success}</Text>
                  {failed > 0 && <Text type="danger">失败: {failed}</Text>}
                </Space>,
              ]
            : null
        }
        width={700}
        closable={isCompleted}
        maskClosable={false}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 总体进度 */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text strong>总体进度</Text>
              <Text>
                {completed} / {total}
              </Text>
            </div>
            <Progress
              percent={progress}
              status={isCompleted ? (failed > 0 ? 'exception' : 'success') : 'active'}
              strokeColor={failed > 0 && isCompleted ? token.colorError : token.colorPrimary}
            />
          </div>

          {/* 统计信息 */}
          {!isCompleted && processing > 0 && (
            <Alert
              message={`正在${operationType} ${processing} 个设备...`}
              type="info"
              showIcon
              icon={<LoadingOutlined />}
            />
          )}

          {isCompleted && (
            <Alert
              message={
                failed === 0
                  ? `所有设备${operationType}成功！`
                  : `${operationType}完成，${success} 个成功，${failed} 个失败`
              }
              type={failed === 0 ? 'success' : 'warning'}
              showIcon
            />
          )}

          {/* 详细列表 */}
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            <List
              dataSource={results}
              renderItem={(item) => (
                <List.Item
                  key={item.deviceId}
                  style={{
                    padding: '12px 0',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: item.errorMessage ? 8 : 0,
                      }}
                    >
                      <Space>
                        {getStatusIcon(item.status)}
                        <Text>{item.deviceName}</Text>
                      </Space>
                      {getStatusTag(item.status)}
                    </div>
                    {item.errorMessage && (
                      <Text type="danger" style={{ fontSize: 12 }}>
                        错误: {item.errorMessage}
                      </Text>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </div>
        </Space>
      </Modal>
    );
  }
);

BatchOperationModal.displayName = 'BatchOperationModal';
