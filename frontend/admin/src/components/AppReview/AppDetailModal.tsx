import { memo } from 'react';
import { Modal, Button, Descriptions, Space, Tag } from 'antd';
import type { Application } from '@/types';
import { ReviewStatusTag } from '@/components/AppReview';
import { formatSize } from './appReviewUtils';
import dayjs from 'dayjs';

interface AppDetailModalProps {
  visible: boolean;
  app: Application | null;
  onClose: () => void;
}

export const AppDetailModal = memo<AppDetailModalProps>(({ visible, app, onClose }) => {
  return (
    <Modal
      title="应用详情"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      width={800}
    >
      {app && (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="应用名称" span={2}>
            {app.name}
          </Descriptions.Item>
          <Descriptions.Item label="包名" span={2}>
            {app.packageName}
          </Descriptions.Item>
          <Descriptions.Item label="版本名称">{app.versionName}</Descriptions.Item>
          <Descriptions.Item label="版本号">{app.versionCode}</Descriptions.Item>
          <Descriptions.Item label="文件大小">{formatSize(app.size)}</Descriptions.Item>
          <Descriptions.Item label="分类">{app.category || '-'}</Descriptions.Item>
          <Descriptions.Item label="最低 SDK">{app.minSdkVersion || '-'}</Descriptions.Item>
          <Descriptions.Item label="目标 SDK">{app.targetSdkVersion || '-'}</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {app.description || '-'}
          </Descriptions.Item>
          {app.permissions && app.permissions.length > 0 && (
            <Descriptions.Item label="权限" span={2}>
              <Space wrap>
                {app.permissions.map((perm) => (
                  <Tag key={perm}>{perm}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="上传者">{app.uploadedBy}</Descriptions.Item>
          <Descriptions.Item label="上传时间">
            {dayjs(app.createdAt).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="审核状态" span={2}>
            <ReviewStatusTag status={app.reviewStatus} />
          </Descriptions.Item>
          {app.reviewComment && (
            <Descriptions.Item label="审核意见" span={2}>
              {app.reviewComment}
            </Descriptions.Item>
          )}
        </Descriptions>
      )}
    </Modal>
  );
});

AppDetailModal.displayName = 'AppDetailModal';
