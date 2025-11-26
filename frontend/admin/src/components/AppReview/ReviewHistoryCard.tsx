import React from 'react';
import { Card, Typography, Timeline } from 'antd';
import {
  HistoryOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { SEMANTIC } from '@/theme';
import dayjs from 'dayjs';
import type { AppReviewRecord } from '@/types';
import { getReviewActionLabel } from '@/utils/appReview';

const { Text } = Typography;

interface ReviewHistoryCardProps {
  reviewHistory: AppReviewRecord[];
}

export const ReviewHistoryCard: React.FC<ReviewHistoryCardProps> = React.memo(
  ({ reviewHistory }) => {
    return (
      <Card
        title={
          <>
            <HistoryOutlined /> 审核历史
          </>
        }
      >
        {reviewHistory.length === 0 ? (
          <Text type="secondary">暂无审核记录</Text>
        ) : (
          <Timeline
            items={reviewHistory.map((record) => ({
              dot:
                record.action === 'approve' ? (
                  <CheckCircleOutlined style={{ color: SEMANTIC.success.main }} />
                ) : record.action === 'reject' ? (
                  <CloseCircleOutlined style={{ color: SEMANTIC.error.main }} />
                ) : (
                  <FileTextOutlined style={{ color: SEMANTIC.warning.main }} />
                ),
              children: (
                <div>
                  <Text strong>{getReviewActionLabel(record.action)}</Text>
                  <br />
                  <Text type="secondary">
                    <UserOutlined /> {record.reviewerName || '审核员'}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Text>
                  {record.comment && (
                    <>
                      <br />
                      <Text>{record.comment}</Text>
                    </>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Card>
    );
  }
);

ReviewHistoryCard.displayName = 'ReviewHistoryCard';
