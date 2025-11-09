import React, { useState } from 'react';
import { Popover, Checkbox, Button, Space } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean; // 必须显示的列（如操作列）
}

interface ColumnVisibilityControlProps {
  columns: ColumnConfig[];
  onChange: (columns: ColumnConfig[]) => void;
}

/**
 * 表格列可见性控制组件
 * 允许用户显示/隐藏表格列
 */
export const ColumnVisibilityControl: React.FC<ColumnVisibilityControlProps> = ({
  columns,
  onChange,
}) => {
  const [visible, setVisible] = useState(false);

  const handleCheckboxChange = (key: string) => (e: CheckboxChangeEvent) => {
    const newColumns = columns.map((col) =>
      col.key === key ? { ...col, visible: e.target.checked } : col
    );
    onChange(newColumns);
  };

  const handleShowAll = () => {
    const newColumns = columns.map((col) => ({ ...col, visible: true }));
    onChange(newColumns);
  };

  const handleHideAll = () => {
    const newColumns = columns.map((col) => ({
      ...col,
      visible: col.required || false,
    }));
    onChange(newColumns);
  };

  const content = (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      <div style={{ marginBottom: 12 }}>
        <Space>
          <Button size="small" onClick={handleShowAll}>
            全部显示
          </Button>
          <Button size="small" onClick={handleHideAll}>
            全部隐藏
          </Button>
        </Space>
      </div>
      <Space direction="vertical" style={{ width: '100%' }}>
        {columns.map((col) => (
          <Checkbox
            key={col.key}
            checked={col.visible}
            disabled={col.required}
            onChange={handleCheckboxChange(col.key)}
          >
            {col.label}
            {col.required && ' (必须)'}
          </Checkbox>
        ))}
      </Space>
    </div>
  );

  const visibleCount = columns.filter((col) => col.visible).length;

  return (
    <Popover
      content={content}
      title="显示列"
      trigger="click"
      placement="bottomRight"
      open={visible}
      onOpenChange={setVisible}
    >
      <Button icon={<SettingOutlined />}>
        列设置 ({visibleCount}/{columns.length})
      </Button>
    </Popover>
  );
};
