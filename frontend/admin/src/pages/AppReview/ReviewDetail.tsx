import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Button, Row, Col } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAppReview } from '@/hooks/useAppReview';
import {
  ReviewDetailHeader,
  ReviewStatusAlert,
  AppInfoCard,
  ReviewChecklistCard,
  ReviewActionsCard,
  ReviewHistoryCard,
  ReviewModal,
} from '@/components/AppReview';

const AppReviewDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    app,
    reviewHistory,
    reviewModalVisible,
    reviewAction,
    openReviewModal,
    closeReviewModal,
    handleReview,
  } = useAppReview(id);

  const handleReviewSubmit = async (values: any) => {
    const success = await handleReview(values);
    if (success) {
      setTimeout(() => navigate('/app-review'), 1000);
    }
  };

  if (!app) {
    return (
      <div style={{ padding: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/app-review')}
          style={{ marginBottom: 24 }}
        >
          返回列表
        </Button>
        <Alert message="应用不存在" type="error" showIcon />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <ReviewDetailHeader onBack={() => navigate('/app-review')} />

      {/* 审核状态提示 */}
      <ReviewStatusAlert reviewStatus={app.reviewStatus || 'pending'} />

      <Row gutter={24}>
        {/* 左侧：应用信息 */}
        <Col xs={24} lg={16}>
          <AppInfoCard app={app} />
          <ReviewChecklistCard />
        </Col>

        {/* 右侧：审核操作和历史 */}
        <Col xs={24} lg={8}>
          {/* 审核操作 */}
          {app.reviewStatus === 'pending' && (
            <ReviewActionsCard
              onApprove={() => openReviewModal('approve')}
              onRequestChanges={() => openReviewModal('request_changes')}
              onReject={() => openReviewModal('reject')}
            />
          )}

          {/* 审核历史 */}
          <ReviewHistoryCard reviewHistory={reviewHistory} />
        </Col>
      </Row>

      {/* 审核模态框 */}
      <ReviewModal
        visible={reviewModalVisible}
        action={reviewAction}
        onCancel={closeReviewModal}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export default AppReviewDetail;
