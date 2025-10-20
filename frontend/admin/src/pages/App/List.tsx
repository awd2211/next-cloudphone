import { Table, Space, Button, Image } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface App {
  id: string;
  name: string;
  packageName: string;
  version: string;
  icon: string;
  size: string;
  downloads: number;
  createdAt: string;
}

const AppList = () => {
  const columns: ColumnsType<App> = [
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      render: (icon: string) => <Image src={icon} width={40} height={40} />,
    },
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '包名',
      dataIndex: 'packageName',
      key: 'packageName',
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
    },
    {
      title: '下载次数',
      dataIndex: 'downloads',
      key: 'downloads',
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: () => (
        <Space size="middle">
          <a>查看</a>
          <a>编辑</a>
          <a>删除</a>
        </Space>
      ),
    },
  ];

  const data: App[] = [];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />}>
          上传应用
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" />
    </div>
  );
};

export default AppList;
