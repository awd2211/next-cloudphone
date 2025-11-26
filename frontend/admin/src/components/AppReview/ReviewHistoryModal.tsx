import { memo } from 'react';
import { Modal, Button, Timeline } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';
import type { Application, AppReviewRecord } from '@/types';
import dayjs from 'dayjs';

interface ReviewHistoryModalProps {
  visible: boolean;
  app: Application | null;
  history: AppReviewRecord[];
  onClose: () => void;
}

export const ReviewHistoryModal = memo<ReviewHistoryModalProps>(
  ({ visible, app, history, onClose }) => {
    const getActionLabel = (action: string) => {
      switch (action) {
        case 'approve':
          return '批准';
        case 'reject':
          return '拒绝';
        case 'request_changes':
          return '请求修改';
        default:
          return '提交审核';
      }
    };

    const getTimelineColor = (action: string) => {
      switch (action) {
        case 'approve':
          return 'green';
        case 'reject':
          return 'red';
        default:
          return 'blue';
      }
    };

    return (
      <Modal
        title="审核历史"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {app && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontWeight: 500 }}>应用名称：</span>
              {app.name}
            </div>
            <Timeline>
              {history.map((record) => (
                <Timeline.Item key={record.id} color={getTimelineColor(record.action)}>
                  <p>
                    <strong>{getActionLabel(record.action)}</strong>
                  </p>
                  <p>操作人：{record.reviewedBy || '-'}</p>
                  {record.comment && <p>备注：{record.comment}</p>}
                  <p style={{ color: NEUTRAL_LIGHT.text.tertiary, fontSize: '12px' }}>
                    {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </p>
                </Timeline.Item>
              ))}
            </Timeline>
          </>
        )}
      </Modal>
    );
  }
);

ReviewHistoryModal.displayName = 'ReviewHistoryModal';
