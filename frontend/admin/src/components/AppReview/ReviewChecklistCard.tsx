import React from 'react';
import { Card, List, Typography } from 'antd';

const { Text } = Typography;

const CHECKLIST_ITEMS = [
  { id: 1, text: '应用名称和描述准确、无误导信息' },
  { id: 2, text: '应用图标清晰、符合规范' },
  { id: 3, text: '无病毒、恶意代码或安全隐患' },
  { id: 4, text: '不包含违法违规内容' },
  { id: 5, text: '功能描述与实际相符' },
  { id: 6, text: '无侵犯他人知识产权行为' },
];

export const ReviewChecklistCard: React.FC = React.memo(() => {
  return (
    <Card title="审核检查清单" style={{ marginBottom: 24 }}>
      <List
        size="small"
        dataSource={CHECKLIST_ITEMS}
        renderItem={(item) => (
          <List.Item>
            <Text>{item.text}</Text>
          </List.Item>
        )}
      />
    </Card>
  );
});

ReviewChecklistCard.displayName = 'ReviewChecklistCard';
