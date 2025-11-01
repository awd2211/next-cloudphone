import React from 'react';
import { Card, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatAmount, type Bill, type BillItem } from '@/services/billing';

const { Text } = Typography;

interface BillItemsTableProps {
  bill: Bill;
}

/**
 * 账单明细表格组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 表格列定义和 Summary 集成在组件内
 */
export const BillItemsTable: React.FC<BillItemsTableProps> = React.memo(({ bill }) => {
  // 账单项表格列
  const columns: ColumnsType<BillItem> = [
    { title: '项目名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', render: (text) => text || '-' },
    { title: '数量', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: (price) => formatAmount(price),
    },
    {
      title: '折扣',
      dataIndex: 'discount',
      key: 'discount',
      width: 100,
      render: (discount) => (discount ? formatAmount(discount) : '-'),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => formatAmount(amount),
    },
  ];

  return (
    <Card title="账单明细" style={{ marginBottom: 16 }}>
      <Table
        columns={columns}
        dataSource={bill.items}
        rowKey="id"
        pagination={false}
        summary={() => (
          <Table.Summary>
            {/* 小计 */}
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                <Text strong>小计：</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong>{formatAmount(bill.amount)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>

            {/* 折扣（可选） */}
            {bill.discountAmount && bill.discountAmount > 0 && (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5} align="right">
                  <Text type="success">折扣：</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text type="success">-{formatAmount(bill.discountAmount)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}

            {/* 税额（可选） */}
            {bill.taxAmount && bill.taxAmount > 0 && (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5} align="right">
                  <Text>税额：</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text>{formatAmount(bill.taxAmount)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}

            {/* 实付金额 */}
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5} align="right">
                <Text strong style={{ fontSize: 16 }}>
                  实付金额：
                </Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                  {formatAmount(bill.finalAmount)}
                </Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
});

BillItemsTable.displayName = 'BillItemsTable';
