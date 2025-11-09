import { Space, Image } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Application, AppReviewRecord } from '@/types';
import {
  AppIcon,
  AppNameDisplay,
  AppVersionTag,
  PendingAppActions,
  ReviewedAppActions,
  ReviewActionTag,
  ReviewStatusTag,
} from '@/components/AppReview';
import { formatSize } from './appReviewUtils';
import { createTimeColumn } from '@/utils/tableColumns';

interface PendingColumnHandlers {
  onViewDetail: (app: Application) => void;
  onApprove: (app: Application) => void;
  onReject: (app: Application) => void;
  onRequestChanges: (app: Application) => void;
}

interface ReviewedColumnHandlers {
  onViewDetail: (app: Application) => void;
  onViewHistory: (app: Application) => void;
}

/**
 * 创建待审核应用表格列
 */
export const createPendingColumns = (
  handlers: PendingColumnHandlers
): ColumnsType<Application> => [
  {
    title: '应用图标',
    dataIndex: 'iconUrl',
    key: 'iconUrl',
    width: 80,
    render: (iconUrl) => <AppIcon iconUrl={iconUrl} />,
  },
  {
    title: '应用名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (text, record) => <AppNameDisplay name={text} packageName={record.packageName} />,
  },
  {
    title: '版本',
    dataIndex: 'versionName',
    key: 'versionName',
    width: 100,
    sorter: (a, b) => a.versionName.localeCompare(b.versionName),
    render: (text, record) => <AppVersionTag versionName={text} versionCode={record.versionCode} />,
  },
  {
    title: '大小',
    dataIndex: 'size',
    key: 'size',
    width: 100,
    sorter: (a, b) => a.size - b.size,
    render: (size) => formatSize(size),
  },
  {
    title: '分类',
    dataIndex: 'category',
    key: 'category',
    width: 100,
    sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
    render: (category) => category || '-',
  },
  {
    title: '上传者',
    dataIndex: 'uploadedBy',
    key: 'uploadedBy',
    width: 120,
    sorter: (a, b) => a.uploadedBy.localeCompare(b.uploadedBy),
  },
  createTimeColumn<Application>('提交时间', 'createdAt', { format: 'YYYY-MM-DD HH:mm' }),
  {
    title: '操作',
    key: 'action',
    width: 300,
    fixed: 'right',
    render: (_, record) => (
      <PendingAppActions
        app={record}
        onViewDetail={handlers.onViewDetail}
        onApprove={handlers.onApprove}
        onReject={handlers.onReject}
        onRequestChanges={handlers.onRequestChanges}
      />
    ),
  },
];

/**
 * 创建已审核应用表格列
 */
export const createReviewedColumns = (
  handlers: ReviewedColumnHandlers
): ColumnsType<Application> => [
  {
    title: '应用名称',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (text, record) => (
      <Space>
        {record.iconUrl && (
          <Image src={record.iconUrl} width={32} height={32} style={{ borderRadius: '4px' }} />
        )}
        <span>{text}</span>
      </Space>
    ),
  },
  {
    title: '版本',
    dataIndex: 'versionName',
    key: 'versionName',
    width: 100,
    sorter: (a, b) => a.versionName.localeCompare(b.versionName),
  },
  {
    title: '状态',
    dataIndex: 'reviewStatus',
    key: 'reviewStatus',
    width: 100,
    sorter: (a, b) => a.reviewStatus.localeCompare(b.reviewStatus),
    render: (status) => <ReviewStatusTag status={status} />,
  },
  {
    title: '审核意见',
    dataIndex: 'reviewComment',
    key: 'reviewComment',
    ellipsis: true,
    sorter: (a, b) => (a.reviewComment || '').localeCompare(b.reviewComment || ''),
    render: (text) => text || '-',
  },
  {
    title: '审核人',
    dataIndex: 'reviewedBy',
    key: 'reviewedBy',
    width: 120,
    sorter: (a, b) => a.reviewedBy.localeCompare(b.reviewedBy),
  },
  createTimeColumn<Application>('审核时间', 'reviewedAt', { format: 'YYYY-MM-DD HH:mm' }),
  {
    title: '操作',
    key: 'action',
    width: 150,
    render: (_, record) => (
      <ReviewedAppActions
        app={record}
        onViewDetail={handlers.onViewDetail}
        onViewHistory={handlers.onViewHistory}
      />
    ),
  },
];

/**
 * 创建审核记录表格列
 */
export const createRecordColumns = (): ColumnsType<AppReviewRecord> => [
  {
    title: '应用名称',
    key: 'appName',
    width: 200,
    sorter: (a, b) => (a.application?.name || '').localeCompare(b.application?.name || ''),
    render: (_, record) => record.application?.name || '-',
  },
  {
    title: '操作',
    dataIndex: 'action',
    key: 'action',
    width: 100,
    sorter: (a, b) => a.action.localeCompare(b.action),
    render: (action) => <ReviewActionTag action={action} />,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    sorter: (a, b) => a.status.localeCompare(b.status),
    render: (status) => <ReviewStatusTag status={status} />,
  },
  {
    title: '备注',
    dataIndex: 'comment',
    key: 'comment',
    ellipsis: true,
    sorter: (a, b) => (a.comment || '').localeCompare(b.comment || ''),
    render: (text) => text || '-',
  },
  {
    title: '操作人',
    dataIndex: 'reviewedBy',
    key: 'reviewedBy',
    width: 120,
    sorter: (a, b) => a.reviewedBy.localeCompare(b.reviewedBy),
  },
  createTimeColumn<AppReviewRecord>('时间', 'createdAt', { format: 'YYYY-MM-DD HH:mm' }),
];
