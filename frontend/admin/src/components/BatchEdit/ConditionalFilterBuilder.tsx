/**
 * 条件过滤器构建组件
 *
 * 用于批量编辑时添加条件过滤
 */

import { memo, useState } from 'react';
import { Card, Form, Select, Input, InputNumber, Button, Space, Tag, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, FilterOutlined } from '@ant-design/icons';
import type { ConditionalFilter, EditField } from '@/hooks/useBatchEdit';

const { Option } = Select;

export interface ConditionalFilterBuilderProps<T = any> {
  /** 可用于过滤的字段列表 */
  fields: EditField<T>[];

  /** 当前过滤器列表 */
  filters: ConditionalFilter<T>[];

  /** 添加过滤器回调 */
  onAddFilter: (filter: ConditionalFilter<T>) => void;

  /** 删除过滤器回调 */
  onRemoveFilter: (index: number) => void;

  /** 受影响的记录数 */
  affectedCount: number;

  /** 总记录数 */
  totalCount: number;
}

/** 操作符选项 */
const OPERATOR_OPTIONS = [
  { label: '等于', value: 'equals' },
  { label: '不等于', value: 'notEquals' },
  { label: '包含', value: 'contains' },
  { label: '不包含', value: 'notContains' },
  { label: '大于', value: 'greaterThan' },
  { label: '小于', value: 'lessThan' },
  { label: '在列表中', value: 'in' },
  { label: '不在列表中', value: 'notIn' },
];

/** 获取字段可用的操作符 */
const getAvailableOperators = (fieldType: string) => {
  switch (fieldType) {
    case 'number':
      return ['equals', 'notEquals', 'greaterThan', 'lessThan', 'in', 'notIn'];
    case 'select':
      return ['equals', 'notEquals', 'in', 'notIn'];
    case 'boolean':
      return ['equals', 'notEquals'];
    case 'text':
    case 'textarea':
      return ['equals', 'notEquals', 'contains', 'notContains'];
    default:
      return ['equals', 'notEquals'];
  }
};

/**
 * 条件过滤器构建组件
 */
export const ConditionalFilterBuilder = memo(
  <T extends Record<string, any> = Record<string, any>>({
    fields,
    filters,
    onAddFilter,
    onRemoveFilter,
    affectedCount,
    totalCount,
  }: ConditionalFilterBuilderProps<T>) => {
    const [selectedField, setSelectedField] = useState<keyof T | null>(null);
    const [selectedOperator, setSelectedOperator] = useState<string>('equals');
    const [filterValue, setFilterValue] = useState<any>('');

    // 获取当前选中字段的配置
    const currentField = fields.find((f) => f.name === selectedField);

    // 处理添加过滤器
    const handleAddFilter = () => {
      if (!selectedField || filterValue === '' || filterValue === null) {
        return;
      }

      const filter: ConditionalFilter<T> = {
        field: selectedField,
        operator: selectedOperator as any,
        value: filterValue,
      };

      onAddFilter(filter);

      // 重置表单
      setSelectedField(null);
      setSelectedOperator('equals');
      setFilterValue('');
    };

    // 渲染值输入控件
    const renderValueInput = () => {
      if (!currentField) return null;

      switch (currentField.type) {
        case 'number':
          return (
            <InputNumber
              value={filterValue}
              onChange={setFilterValue}
              placeholder="输入数值"
              style={{ width: '100%' }}
            />
          );

        case 'select':
          if (selectedOperator === 'in' || selectedOperator === 'notIn') {
            return (
              <Select
                mode="multiple"
                value={filterValue}
                onChange={setFilterValue}
                placeholder="选择值"
                style={{ width: '100%' }}
              >
                {currentField.options?.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            );
          } else {
            return (
              <Select
                value={filterValue}
                onChange={setFilterValue}
                placeholder="选择值"
                style={{ width: '100%' }}
              >
                {currentField.options?.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            );
          }

        case 'boolean':
          return (
            <Select value={filterValue} onChange={setFilterValue} style={{ width: '100%' }}>
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          );

        default:
          return (
            <Input
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="输入值"
            />
          );
      }
    };

    // 获取过滤器的显示文本
    const getFilterDisplayText = (filter: ConditionalFilter<T>) => {
      const field = fields.find((f) => f.name === filter.field);
      const operator = OPERATOR_OPTIONS.find((o) => o.value === filter.operator);

      let valueText = filter.value;
      if (field?.type === 'select' && field.options) {
        if (Array.isArray(filter.value)) {
          const labels = filter.value
            .map((v) => field.options?.find((o) => o.value === v)?.label || v)
            .join(', ');
          valueText = `[${labels}]`;
        } else {
          valueText = field.options.find((o) => o.value === filter.value)?.label || filter.value;
        }
      } else if (field?.type === 'boolean') {
        valueText = filter.value ? '是' : '否';
      }

      return `${field?.label} ${operator?.label} ${valueText}`;
    };

    return (
      <Card
        title={
          <Space>
            <FilterOutlined />
            <span>条件过滤</span>
          </Space>
        }
        size="small"
      >
        {/* 受影响记录数提示 */}
        <Alert
          message={
            <span>
              将对 <strong>{affectedCount}</strong> 条记录应用更改
              {filters.length > 0 && ` (从 ${totalCount} 条记录中过滤)`}
            </span>
          }
          type={filters.length > 0 ? 'warning' : 'info'}
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* 添加过滤器表单 */}
        <Form layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item label="字段">
            <Select
              value={selectedField as string}
              onChange={setSelectedField}
              placeholder="选择字段"
              style={{ width: 150 }}
            >
              {fields.map((field) => (
                <Option key={field.name as string} value={field.name as string}>
                  {field.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="条件">
            <Select
              value={selectedOperator}
              onChange={setSelectedOperator}
              placeholder="选择条件"
              style={{ width: 120 }}
              disabled={!currentField}
            >
              {OPERATOR_OPTIONS.filter((opt) =>
                currentField
                  ? getAvailableOperators(currentField.type).includes(opt.value)
                  : true
              ).map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="值" style={{ flex: 1 }}>
            {renderValueInput()}
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddFilter}
              disabled={!selectedField || filterValue === '' || filterValue === null}
            >
              添加
            </Button>
          </Form.Item>
        </Form>

        {/* 已添加的过滤器列表 */}
        {filters.length > 0 && (
          <Space direction="vertical" style={{ width: '100%' }}>
            {filters.map((filter, index) => (
              <Tag
                key={index}
                closable
                onClose={() => onRemoveFilter(index)}
                icon={<FilterOutlined />}
                color="blue"
              >
                {getFilterDisplayText(filter)}
              </Tag>
            ))}
          </Space>
        )}
      </Card>
    );
  }
) as <T extends Record<string, any> = Record<string, any>>(
  props: ConditionalFilterBuilderProps<T>
) => JSX.Element;

ConditionalFilterBuilder.displayName = 'ConditionalFilterBuilder';
