import { useState, useEffect } from 'react';
import { Table, Space, Button, Image, Upload, Modal, message, Popconfirm, Progress } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { getApps, uploadApp, deleteApp } from '@/services/app';
import type { Application } from '@/types';
import dayjs from 'dayjs';

const AppList = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const res = await getApps({ page, pageSize });
      setApps(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, [page, pageSize]);

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('请选择要上传的 APK 文件');
      return;
    }

    const file = fileList[0] as any;
    setUploading(true);
    try {
      await uploadApp(file.originFileObj, (percent) => {
        setUploadProgress(percent);
      });
      message.success('应用上传成功');
      setUploadModalVisible(false);
      setFileList([]);
      setUploadProgress(0);
      loadApps();
    } catch (error) {
      message.error('应用上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApp(id);
      message.success('删除应用成功');
      loadApps();
    } catch (error) {
      message.error('删除应用失败');
    }
  };

  const columns: ColumnsType<Application> = [
    { title: '图标', dataIndex: 'iconUrl', key: 'iconUrl', width: 80, render: (iconUrl: string) => iconUrl ? <Image src={iconUrl} width={40} height={40} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" /> : <div style={{ width: 40, height: 40, background: '#f0f0f0' }} /> },
    { title: '应用名称', dataIndex: 'name', key: 'name' },
    { title: '包名', dataIndex: 'packageName', key: 'packageName', ellipsis: true },
    { title: '版本', dataIndex: 'versionName', key: 'versionName', render: (versionName: string, record) => `${versionName} (${record.versionCode})` },
    { title: '大小', dataIndex: 'size', key: 'size', render: (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB` },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '上传时间', dataIndex: 'createdAt', key: 'createdAt', render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm') },
    { title: '操作', key: 'action', width: 150, fixed: 'right', render: (_, record) => (
      <Space size="small">
        <Popconfirm title="确定要删除这个应用吗?" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
          <Button type="link" size="small" icon={<DeleteOutlined />} danger>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <h2>应用管理</h2>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadModalVisible(true)}>上传应用</Button>
      </div>
      <Table columns={columns} dataSource={apps} rowKey="id" loading={loading} pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (total) => `共 ${total} 条`, onChange: (page, pageSize) => { setPage(page); setPageSize(pageSize); }}} scroll={{ x: 1000 }} />
      <Modal title="上传应用" open={uploadModalVisible} onCancel={() => { setUploadModalVisible(false); setFileList([]); setUploadProgress(0); }} onOk={handleUpload} confirmLoading={uploading}>
        <Upload.Dragger fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} beforeUpload={() => false} accept=".apk" maxCount={1}>
          <p className="ant-upload-drag-icon">📱</p>
          <p className="ant-upload-text">点击或拖拽 APK 文件到此区域</p>
          <p className="ant-upload-hint">支持单个 APK 文件上传，最大 100MB</p>
        </Upload.Dragger>
        {uploading && uploadProgress > 0 && <Progress percent={uploadProgress} style={{ marginTop: 16 }} />}
      </Modal>
    </div>
  );
};

export default AppList;
