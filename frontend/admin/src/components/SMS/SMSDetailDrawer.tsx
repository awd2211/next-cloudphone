import { memo } from 'react';
import { Drawer, Descriptions, Tag } from 'antd';
import type { SMSRecord } from './types';

export interface SMSDetailDrawerProps {
  visible: boolean;
  record: SMSRecord | null;
  onClose: () => void;
}

/**
 * SMS 详情抽屉组件
 */
export const SMSDetailDrawer = memo<SMSDetailDrawerProps>(
  ({ visible, record, onClose }) => {
    return (
      <Drawer
        title="短信详情"
        open={visible}
        onClose={onClose}
        width={600}
      >
        {record && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="手机号">{record.phone}</Descriptions.Item>
            <Descriptions.Item label="内容">{record.content}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag
                color={
                  record.status === 'delivered'
                    ? 'success'
                    : record.status === 'failed'
                      ? 'error'
                      : 'processing'
                }
              >
                {record.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="供应商">
              {record.provider}
            </Descriptions.Item>
            <Descriptions.Item label="用户">
              {record.userName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="模板代码">
              {record.templateCode || '-'}
            </Descriptions.Item>
            {record.variables && (
              <Descriptions.Item label="模板变量">
                <pre>{JSON.stringify(record.variables, null, 2)}</pre>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="发送时间">
              {record.sentAt || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="送达时间">
              {record.deliveredAt || '-'}
            </Descriptions.Item>
            {record.errorMessage && (
              <Descriptions.Item label="错误信息">
                <span style={{ color: 'red' }}>{record.errorMessage}</span>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="创建时间">
              {record.createdAt}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    );
  },
);

SMSDetailDrawer.displayName = 'SMSDetailDrawer';
