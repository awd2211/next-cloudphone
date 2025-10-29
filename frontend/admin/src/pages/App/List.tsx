import { useState, useMemo, useCallback } from 'react';
import { Table, Space, Button, Image, Upload, Modal, message, Popconfirm, Progress } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import * as appService from '@/services/app';
import type { Application } from '@/types';
import dayjs from 'dayjs';
import {
  useApps,
  useUploadApp,
  useDeleteApp
} from '@/hooks/useApps';

/**
 * 应用列表页面（优化版 - 使用 React Query）
 *
 * 优化点：
 * 1. ✅ 使用 React Query 自动管理状态和缓存
 * 2. ✅ 使用 useMemo 优化重复计算
 * 3. ✅ 使用 useCallback 优化事件处理函数
 * 4. ✅ 自动请求去重和缓存
 * 5. ✅ 乐观更新支持
 */
const AppList = () => {
  // Modal和上传状态
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  // ✅ 使用 React Query hooks 替换手动状态管理
  const params = useMemo(() => ({ page, pageSize }), [page, pageSize]);
  const { data, isLoading } = useApps(params);

  // Mutations
  const uploadMutation = useUploadApp();
  const deleteMutation = useDeleteApp();

  const apps = data?.data || [];
  const total = data?.total || 0;

  // ✅ useCallback 优化事件处理函数
  const handleUpload = useCallback(async () => {
    if (fileList.length === 0) {
      message.error('请选择要上传的 APK 文件');
      return;
    }

    const file = fileList[0] as any;
    try {
      await uploadMutation.mutateAsync({
        file: file.originFileObj,
        onProgress: (percent) => {
          setUploadProgress(percent);
        }
      });
      setUploadModalVisible(false);
      setFileList([]);
      setUploadProgress(0);
    } catch (error) {
      // Error already handled by mutation
    }
  }, [fileList, uploadMutation]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const handleModalCancel = useCallback(() => {
    setUploadModalVisible(false);
    setFileList([]);
    setUploadProgress(0);
  }, []);

  const handleFileListChange = useCallback(({ fileList }: { fileList: UploadFile[] }) => {
    setFileList(fileList);
  }, []);

  // ✅ useMemo 优化表格列配置
  const columns: ColumnsType<Application> = useMemo(() => [
    {
      title: '图标',
      dataIndex: 'iconUrl',
      key: 'iconUrl',
      width: 80,
      render: (iconUrl: string) => iconUrl ? (
        <Image
          src={iconUrl}
          width={40}
          height={40}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        />
      ) : (
        <div style={{ width: 40, height: 40, background: '#f0f0f0' }} />
      )
    },
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: '包名',
      dataIndex: 'packageName',
      key: 'packageName',
      ellipsis: true,
      sorter: (a, b) => a.packageName.localeCompare(b.packageName),
    },
    {
      title: '版本',
      dataIndex: 'versionName',
      key: 'versionName',
      render: (versionName: string, record) => `${versionName} (${record.versionCode})`,
      sorter: (a, b) => a.versionCode - b.versionCode,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => `${((size || 0) / 1024 / 1024).toFixed(2)} MB`,
      sorter: (a, b) => (a.size || 0) - (b.size || 0),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Popconfirm
            title="确定要删除这个应用吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" icon={<DeleteOutlined />} danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [handleDelete]);

  return (
    <div>
      <h2>应用管理</h2>

      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setUploadModalVisible(true)}
        >
          上传应用
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={apps}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, pageSize) => {
            setPage(page);
            setPageSize(pageSize);
          },
        }}
        scroll={{ x: 1000 }}
      />

      {/* 上传应用Modal */}
      <Modal
        title="上传应用"
        open={uploadModalVisible}
        onCancel={handleModalCancel}
        onOk={handleUpload}
        confirmLoading={uploadMutation.isPending}
      >
        <Upload.Dragger
          fileList={fileList}
          onChange={handleFileListChange}
          beforeUpload={() => false}
          accept=".apk"
          maxCount={1}
        >
          <p className="ant-upload-drag-icon">📱</p>
          <p className="ant-upload-text">点击或拖拽 APK 文件到此区域</p>
          <p className="ant-upload-hint">支持单个 APK 文件上传，最大 100MB</p>
        </Upload.Dragger>
        {uploadMutation.isPending && uploadProgress > 0 && (
          <Progress percent={uploadProgress} style={{ marginTop: 16 }} />
        )}
      </Modal>
    </div>
  );
};

export default AppList;
