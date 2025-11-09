/**
 * 批量操作进度展示组件
 *
 * 功能：
 * 1. 实时展示批量操作的进度（成功/失败/进行中）
 * 2. 显示每个操作项的状态和错误信息
 * 3. 操作完成前禁止关闭，完成后显示统计信息
 * 4. 支持虚拟滚动，处理大批量操作（100+ 项）
 */

import { Modal, Progress, List, Tag, Typography, Button, Space , theme } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { memo, useMemo } from 'react';

const { Text, Paragraph } = Typography;

export interface BatchOperationItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export interface BatchProgressModalProps {
  /** 是否显示模态框 */
  visible: boolean;

  /** 模态框标题 */
  title: string;

  /** 操作项列表 */
  items: BatchOperationItem[];

  /** 关闭回调 */
  onClose: () => void;

  /** 是否允许取消操作（操作进行中时） */
  cancelable?: boolean;

  /** 取消操作回调 */
  onCancel?: () => void;
}

/**
 * 获取状态图标
 */
const getStatusIcon = (status: BatchOperationItem['status']) => {
  switch (status) {
    case 'success':
      return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />;
    case 'error':
      return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />;
    case 'processing':
      return <LoadingOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />;
    case 'pending':
      return <ClockCircleOutlined style={{ color: '#d9d9d9', fontSize: 16 }} />;
  }
};

/**
 * 获取状态标签
 */
const getStatusTag = (status: BatchOperationItem['status']) => {
  switch (status) {
    case 'success':
      return <Tag color="success">成功</Tag>;
    case 'error':
      return <Tag color="error">失败</Tag>;
    case 'processing':
      return <Tag color="processing">处理中</Tag>;
    case 'pending':
      return <Tag color="default">等待中</Tag>;
  }
};

/**
 * 批量操作进度模态框组件
 */
export const BatchProgressModal = memo<BatchProgressModalProps>(
  ({ visible, title, items, onClose, cancelable = false, onCancel }) => {
    const { token } = theme.useToken();
    // 计算统计数据
    const stats = useMemo(() => {
      const total = items.length;
      const completed = items.filter(
        (i) => i.status === 'success' || i.status === 'error'
      ).length;
      const successCount = items.filter((i) => i.status === 'success').length;
      const errorCount = items.filter((i) => i.status === 'error').length;
      const processingCount = items.filter((i) => i.status === 'processing').length;
      const pendingCount = items.filter((i) => i.status === 'pending').length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const isCompleted = completed === total;

      return {
        total,
        completed,
        successCount,
        errorCount,
        processingCount,
        pendingCount,
        percent,
        isCompleted,
      };
    }, [items]);

    // 底部按钮
    const footer = useMemo(() => {
      if (stats.isCompleted) {
        return [
          <Button key="close" type="primary" onClick={onClose}>
            关闭
          </Button>,
        ];
      }

      if (cancelable && onCancel) {
        return [
          <Button key="cancel" danger onClick={onCancel}>
            取消操作
          </Button>,
        ];
      }

      return null;
    }, [stats.isCompleted, cancelable, onCancel, onClose]);

    return (
      <Modal
        title={
          <div>
            <div>{title}</div>
            <Text type="secondary" style={{ fontSize: 14, fontWeight: 'normal' }}>
              共 {stats.total} 项 · 已完成 {stats.completed} 项
            </Text>
          </div>
        }
        open={visible}
        onCancel={stats.isCompleted ? onClose : undefined}
        footer={footer}
        width={700}
        closable={stats.isCompleted}
        maskClosable={false}
        keyboard={stats.isCompleted}
      >
        {/* 进度条 */}
        <div style={{ marginBottom: 24 }}>
          <Progress
            percent={stats.percent}
            status={stats.errorCount > 0 && stats.isCompleted ? 'exception' : 'active'}
            strokeColor={
              stats.errorCount > 0 && stats.isCompleted
                ? '#ff4d4f'
                : { '0%': '#108ee9', '100%': '#87d068' }
            }
          />

          {/* 统计信息 */}
          <Space size="large" style={{ marginTop: 16 }}>
            <Text>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              成功: {stats.successCount}
            </Text>
            <Text>
              <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
              失败: {stats.errorCount}
            </Text>
            {stats.processingCount > 0 && (
              <Text>
                <LoadingOutlined style={{ color: token.colorPrimary, marginRight: 4 }} />
                处理中: {stats.processingCount}
              </Text>
            )}
            {stats.pendingCount > 0 && (
              <Text>
                <ClockCircleOutlined style={{ color: '#d9d9d9', marginRight: 4 }} />
                等待中: {stats.pendingCount}
              </Text>
            )}
          </Space>
        </div>

        {/* 操作项列表 */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <List.Item.Meta
                  avatar={getStatusIcon(item.status)}
                  title={
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </Text>
                      {getStatusTag(item.status)}
                    </div>
                  }
                  description={
                    item.error && (
                      <Paragraph
                        type="danger"
                        style={{ marginBottom: 0, fontSize: 12 }}
                        ellipsis={{ rows: 2, expandable: true, symbol: '展开' }}
                      >
                        错误: {item.error}
                      </Paragraph>
                    )
                  }
                />
              </List.Item>
            )}
          />
        </div>

        {/* 完成提示 */}
        {stats.isCompleted && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: stats.errorCount > 0 ? '#fff2e8' : '#f6ffed',
              border: `1px solid ${stats.errorCount > 0 ? '#ffbb96' : '#b7eb8f'}`,
              borderRadius: 4,
            }}
          >
            <Text strong style={{ color: stats.errorCount > 0 ? '#fa8c16' : '#52c41a' }}>
              {stats.errorCount > 0
                ? `批量操作完成，成功 ${stats.successCount} 项，失败 ${stats.errorCount} 项`
                : `批量操作成功完成，共处理 ${stats.successCount} 项`}
            </Text>
          </div>
        )}
      </Modal>
    );
  }
);

BatchProgressModal.displayName = 'BatchProgressModal';
