/**
 * HistoryDetailModal - 历史详情弹窗组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import {
  Modal,
  Button,
  Space,
  Descriptions,
  Divider,
  Row,
  Col,
  Card,
  Statistic,
  Timeline,
} from 'antd';
import { LifecycleStatusTag } from '@/components/Lifecycle';
import type { LifecycleExecutionHistory } from '@/types';
import dayjs from 'dayjs';

interface HistoryDetailModalProps {
  visible: boolean;
  selectedHistory: LifecycleExecutionHistory | null;
  onClose: () => void;
}

/**
 * HistoryDetailModal 组件
 * 显示生命周期规则执行历史的详细信息
 */
export const HistoryDetailModal = memo<HistoryDetailModalProps>(
  ({ visible, selectedHistory, onClose }) => {
    return (
      <Modal
        title="执行详情"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedHistory && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="规则名称" span={2}>
                {selectedHistory.ruleName}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <LifecycleStatusTag status={selectedHistory.status} />
              </Descriptions.Item>
              <Descriptions.Item label="触发方式">
                {selectedHistory.executedBy === 'manual' ? '手动' : '自动'}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {dayjs(selectedHistory.startTime).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="结束时间">
                {selectedHistory.endTime
                  ? dayjs(selectedHistory.endTime).format('YYYY-MM-DD HH:mm:ss')
                  : '进行中'}
              </Descriptions.Item>
              <Descriptions.Item label="影响设备数" span={2}>
                {selectedHistory.affectedDevices}
              </Descriptions.Item>
            </Descriptions>

            {selectedHistory.details && (
              <>
                <Divider>执行结果</Divider>
                <Row gutter={16}>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="成功"
                        value={selectedHistory.details.succeeded}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="失败"
                        value={selectedHistory.details.failed}
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="跳过"
                        value={selectedHistory.details.skipped}
                        valueStyle={{ color: '#8c8c8c' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {selectedHistory.details.errors && selectedHistory.details.errors.length > 0 && (
                  <>
                    <Divider>错误信息</Divider>
                    <Timeline>
                      {selectedHistory.details.errors.map((error, index) => (
                        <Timeline.Item key={index} color="red">
                          {error}
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </>
                )}
              </>
            )}
          </Space>
        )}
      </Modal>
    );
  }
);

HistoryDetailModal.displayName = 'HistoryDetailModal';
