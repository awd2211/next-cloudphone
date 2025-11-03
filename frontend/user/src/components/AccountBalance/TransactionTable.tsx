import { memo } from 'react';
import { Card, Space, Button, Table, Typography } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Transaction } from '@/hooks/useAccountBalance';

const { Text } = Typography;

interface TransactionTableProps {
  transactions: Transaction[];
  columns: ColumnsType<Transaction>;
  loading: boolean;
}

export const TransactionTable = memo<TransactionTableProps>(
  ({ transactions, columns, loading }) => {
    return (
      <Card
        title={
          <Space>
            <LineChartOutlined />
            <Text strong>交易记录</Text>
          </Space>
        }
        extra={
          <Button type="link" onClick={() => (window.location.href = '/billing')}>
            查看全部
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    );
  }
);

TransactionTable.displayName = 'TransactionTable';
