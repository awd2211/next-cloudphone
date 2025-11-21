import React from 'react';
import { ColumnsType } from 'antd/es/table';
import { Tag, Button, Space, Tooltip } from 'antd';
import dayjs from 'dayjs';

/**
 * 时间列配置工厂
 * @param title 列标题
 * @param dataIndex 数据索引
 * @param format 时间格式
 */
export function createTimeColumn<T = any>(
  title: string,
  dataIndex: string,
  options?: {
    format?: string;
    width?: number;
    sorter?: boolean;
    showTooltip?: boolean;
  }
): ColumnsType<T>[number] {
  const {
    format = 'YYYY-MM-DD HH:mm:ss',
    width = 180,
    sorter = true,
    showTooltip = false
  } = options || {};

  return {
    title,
    dataIndex,
    width,
    sorter: sorter ? (a: any, b: any) => {
      const aTime = a[dataIndex];
      const bTime = b[dataIndex];
      if (!aTime) return -1;
      if (!bTime) return 1;
      return dayjs(aTime).unix() - dayjs(bTime).unix();
    } : undefined,
    render: (time: string) => {
      if (!time) return '-';
      const formatted = dayjs(time).format(format);

      if (showTooltip) {
        return (
          <Tooltip title={dayjs(time).format('YYYY-MM-DD HH:mm:ss.SSS')}>
            {formatted}
          </Tooltip>
        );
      }

      return formatted;
    },
  };
}

/**
 * 状态列配置工厂
 * @param dataIndex 数据索引
 * @param statusMap 状态映射
 */
export function createStatusColumn<T = any>(
  dataIndex: string,
  statusMap: Record<string, { label: string; color: string; icon?: React.ReactNode }>,
  options?: {
    title?: string;
    width?: number;
    enableFilter?: boolean;
  }
): ColumnsType<T>[number] {
  const { title = '状态', width = 100, enableFilter = true } = options || {};

  return {
    title,
    dataIndex,
    width,
    render: (status: string) => {
      const config = statusMap[status] || { label: status, color: 'default' };
      return (
        <Tag color={config.color} icon={config.icon}>
          {config.label}
        </Tag>
      );
    },
    filters: enableFilter
      ? Object.entries(statusMap).map(([value, { label }]) => ({
          text: label,
          value
        }))
      : undefined,
    onFilter: enableFilter
      ? (value, record: any) => record[dataIndex] === value
      : undefined,
  };
}

/**
 * 操作列配置工厂
 * @param actions 操作按钮配置
 */
export function createActionsColumn<T = any>(
  actions: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    danger?: boolean;
    disabled?: (record: T) => boolean;
    visible?: (record: T) => boolean;
    onClick: (record: T) => void;
    tooltip?: string;
  }>,
  options?: {
    title?: string;
    width?: number;
    fixed?: 'left' | 'right';
  }
): ColumnsType<T>[number] {
  const { title = '操作', width = 150, fixed = 'right' } = options || {};

  return {
    title,
    key: 'actions',
    width,
    fixed,
    render: (_, record: T) => {
      const visibleActions = actions.filter(
        action => !action.visible || action.visible(record)
      );

      if (visibleActions.length === 0) {
        return <span style={{ color: '#999' }}>-</span>;
      }

      return (
        <Space size="small">
          {visibleActions.map(action => {
            const isDisabled = action.disabled?.(record) || false;

            const button = (
              <Button
                key={action.key}
                type="link"
                size="small"
                icon={action.icon}
                danger={action.danger}
                disabled={isDisabled}
                onClick={() => action.onClick(record)}
                style={{ padding: '0 4px' }}
              >
                {action.label}
              </Button>
            );

            if (action.tooltip) {
              return (
                <Tooltip key={action.key} title={action.tooltip}>
                  {button}
                </Tooltip>
              );
            }

            return button;
          })}
        </Space>
      );
    },
  };
}

/**
 * 布尔值列配置工厂
 * @param title 列标题
 * @param dataIndex 数据索引
 */
export function createBooleanColumn<T = any>(
  title: string,
  dataIndex: string,
  options?: {
    trueLabel?: string;
    falseLabel?: string;
    trueColor?: string;
    falseColor?: string;
    width?: number;
    enableFilter?: boolean;
  }
): ColumnsType<T>[number] {
  const {
    trueLabel = '是',
    falseLabel = '否',
    trueColor = 'success',
    falseColor = 'default',
    width = 80,
    enableFilter = true,
  } = options || {};

  return {
    title,
    dataIndex,
    width,
    render: (value: boolean) => (
      <Tag color={value ? trueColor : falseColor}>
        {value ? trueLabel : falseLabel}
      </Tag>
    ),
    filters: enableFilter
      ? [
          { text: trueLabel, value: true },
          { text: falseLabel, value: false },
        ]
      : undefined,
    onFilter: enableFilter
      ? (value, record: any) => record[dataIndex] === value
      : undefined,
  };
}

/**
 * 标签列配置工厂
 * @param title 列标题
 * @param dataIndex 数据索引
 */
export function createTagsColumn<T = any>(
  title: string,
  dataIndex: string,
  options?: {
    maxTags?: number;
    width?: number;
    colorMap?: Record<string, string>;
  }
): ColumnsType<T>[number] {
  const { maxTags = 3, width = 200, colorMap } = options || {};

  return {
    title,
    dataIndex,
    width,
    render: (tags: string[]) => {
      if (!tags || tags.length === 0) {
        return <span style={{ color: '#999' }}>-</span>;
      }

      const visibleTags = tags.slice(0, maxTags);
      const remainingCount = tags.length - maxTags;

      return (
        <Space size={4} wrap>
          {visibleTags.map((tag, index) => (
            <Tag key={index} color={colorMap?.[tag] || 'blue'}>
              {tag}
            </Tag>
          ))}
          {remainingCount > 0 && (
            <Tooltip title={tags.slice(maxTags).join(', ')}>
              <Tag>+{remainingCount}</Tag>
            </Tooltip>
          )}
        </Space>
      );
    },
  };
}

/**
 * 数字列配置工厂
 * @param title 列标题
 * @param dataIndex 数据索引
 */
export function createNumberColumn<T = any>(
  title: string,
  dataIndex: string,
  options?: {
    width?: number;
    precision?: number;
    prefix?: string;
    suffix?: string;
    sorter?: boolean;
    align?: 'left' | 'right' | 'center';
  }
): ColumnsType<T>[number] {
  const {
    width = 120,
    precision = 0,
    prefix = '',
    suffix = '',
    sorter = true,
    align = 'right'
  } = options || {};

  return {
    title,
    dataIndex,
    width,
    align,
    sorter: sorter ? (a: any, b: any) => {
      const aVal = a[dataIndex] ?? 0;
      const bVal = b[dataIndex] ?? 0;
      return aVal - bVal;
    } : undefined,
    render: (value: number) => {
      if (value === null || value === undefined) {
        return <span style={{ color: '#999' }}>-</span>;
      }
      const formatted = precision > 0
        ? value.toFixed(precision)
        : Math.round(value).toString();

      return `${prefix}${formatted}${suffix}`;
    },
  };
}

/**
 * 百分比列配置工厂
 */
export function createPercentColumn<T = any>(
  title: string,
  dataIndex: string,
  options?: {
    width?: number;
    precision?: number;
    sorter?: boolean;
    colorRange?: {
      min: number;
      max: number;
      lowColor?: string;
      highColor?: string;
    };
  }
): ColumnsType<T>[number] {
  const { width = 100, precision = 1, sorter = true, colorRange } = options || {};

  return {
    title,
    dataIndex,
    width,
    align: 'right',
    sorter: sorter ? (a: any, b: any) => (a[dataIndex] ?? 0) - (b[dataIndex] ?? 0) : undefined,
    render: (value: number) => {
      if (value === null || value === undefined) {
        return <span style={{ color: '#999' }}>-</span>;
      }

      let color = undefined;
      if (colorRange) {
        const { min, max, lowColor = '#52c41a', highColor = '#f5222d' } = colorRange;
        if (value <= min) {
          color = lowColor;
        } else if (value >= max) {
          color = highColor;
        }
      }

      return (
        <span style={{ color }}>
          {value.toFixed(precision)}%
        </span>
      );
    },
  };
}

/**
 * 链接列配置工厂
 */
export function createLinkColumn<T = any>(
  title: string,
  dataIndex: string,
  getHref: (record: T) => string,
  options?: {
    width?: number;
    external?: boolean;
    ellipsis?: boolean;
  }
): ColumnsType<T>[number] {
  const { width = 150, external = false, ellipsis = true } = options || {};

  return {
    title,
    dataIndex,
    width,
    ellipsis,
    render: (text: string, record: T) => {
      if (!text) return '-';

      const href = getHref(record);
      return (
        <a
          href={href}
          target={external ? '_blank' : '_self'}
          rel={external ? 'noopener noreferrer' : undefined}
        >
          {text}
        </a>
      );
    },
  };
}

/**
 * 索引列配置工厂
 */
export function createIndexColumn<T = any>(
  options?: {
    title?: string;
    width?: number;
    startIndex?: number;
  }
): ColumnsType<T>[number] {
  const { title = '序号', width = 60, startIndex = 1 } = options || {};

  return {
    title,
    key: 'index',
    width,
    align: 'center',
    fixed: 'left',
    render: (_: any, __: T, index: number) => startIndex + index,
  };
}
