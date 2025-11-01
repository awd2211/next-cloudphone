import { memo } from 'react';
import { Modal, Button, Descriptions, Tag } from 'antd';
import type { BillingRule } from '@/types';
import dayjs from 'dayjs';

interface BillingRuleDetailModalProps {
  visible: boolean;
  selectedRule: BillingRule | null;
  onClose: () => void;
}

export const BillingRuleDetailModal = memo<BillingRuleDetailModalProps>(
  ({ visible, selectedRule, onClose }) => {
    return (
      <Modal
        title="规则详情"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {selectedRule && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="规则名称">{selectedRule.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{selectedRule.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="类型">
              <Tag
                color={
                  selectedRule.type === 'time-based'
                    ? 'blue'
                    : selectedRule.type === 'usage-based'
                      ? 'green'
                      : selectedRule.type === 'tiered'
                        ? 'orange'
                        : 'purple'
                }
              >
                {selectedRule.type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="计费公式">
              <code>{selectedRule.formula}</code>
            </Descriptions.Item>
            <Descriptions.Item label="参数">
              <pre style={{ margin: 0, fontSize: '12px' }}>
                {JSON.stringify(selectedRule.parameters, null, 2)}
              </pre>
            </Descriptions.Item>
            <Descriptions.Item label="优先级">{selectedRule.priority}</Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedRule.isActive ? (
                <Tag color="success">激活</Tag>
              ) : (
                <Tag color="error">停用</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="有效期">
              {selectedRule.validFrom && selectedRule.validUntil
                ? `${dayjs(selectedRule.validFrom).format('YYYY-MM-DD')} 至 ${dayjs(selectedRule.validUntil).format('YYYY-MM-DD')}`
                : '永久有效'}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(selectedRule.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    );
  }
);

BillingRuleDetailModal.displayName = 'BillingRuleDetailModal';
