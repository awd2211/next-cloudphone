import { memo } from 'react';
import { Modal, Descriptions, Progress, Alert } from 'antd';
import type { QueueJobDetail } from '@/types';
import dayjs from 'dayjs';

interface JobDetailModalProps {
  visible: boolean;
  jobDetail: QueueJobDetail | null;
  onClose: () => void;
}

export const JobDetailModal = memo<JobDetailModalProps>(({
  visible,
  jobDetail,
  onClose,
}) => {
  if (!jobDetail) return null;

  return (
    <Modal
      title="任务详情"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Descriptions bordered column={1}>
        <Descriptions.Item label="任务ID">{jobDetail.id}</Descriptions.Item>
        <Descriptions.Item label="任务名称">{jobDetail.name}</Descriptions.Item>
        <Descriptions.Item label="进度">
          <Progress percent={jobDetail.progress} />
        </Descriptions.Item>
        <Descriptions.Item label="尝试次数">{jobDetail.attemptsMade}</Descriptions.Item>
        <Descriptions.Item label="延迟">{jobDetail.delay}ms</Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {dayjs(jobDetail.timestamp).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        {jobDetail.processedOn && (
          <Descriptions.Item label="处理时间">
            {dayjs(jobDetail.processedOn).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        )}
        {jobDetail.finishedOn && (
          <Descriptions.Item label="完成时间">
            {dayjs(jobDetail.finishedOn).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
        )}
        {jobDetail.failedReason && (
          <Descriptions.Item label="失败原因">
            <Alert message={jobDetail.failedReason} type="error" />
          </Descriptions.Item>
        )}
        {jobDetail.stacktrace && jobDetail.stacktrace.length > 0 && (
          <Descriptions.Item label="堆栈跟踪">
            <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
              {jobDetail.stacktrace.join('\n')}
            </pre>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="任务数据">
          <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
            {JSON.stringify(jobDetail.data, null, 2)}
          </pre>
        </Descriptions.Item>
        {jobDetail.returnvalue && (
          <Descriptions.Item label="返回值">
            <pre style={{ maxHeight: '200px', overflow: 'auto' }}>
              {JSON.stringify(jobDetail.returnvalue, null, 2)}
            </pre>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Modal>
  );
});

JobDetailModal.displayName = 'JobDetailModal';
