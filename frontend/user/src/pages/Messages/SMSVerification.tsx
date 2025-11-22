import { useState } from 'react';
import { Card, Input, Button, Table, Tag, Space, message, Empty } from 'antd';
import { SearchOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  useVerificationCodeByPhone,
  useMyVerificationCodes,
} from '@/hooks/queries/useSMS';
import type { VerificationCode } from '@/services/sms';
import { getListData } from '@/types';

dayjs.extend(relativeTime);

/**
 * SMS验证码查询页面 - 用户端
 *
 * 功能：
 * 1. 按手机号查询验证码
 * 2. 查看收到的验证码历史
 * 3. 复制验证码
 */
const SMSVerification: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchPhone, setSearchPhone] = useState('');

  // 使用自定义 React Query Hooks
  const { data, isLoading, refetch } = useVerificationCodeByPhone(searchPhone, {
    enabled: !!searchPhone,
  });
  const { data: historyData, isLoading: historyLoading } = useMyVerificationCodes();

  const handleSearch = () => {
    if (!phoneNumber.trim()) {
      message.warning('请输入手机号');
      return;
    }
    setSearchPhone(phoneNumber.trim());
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    message.success('验证码已复制到剪贴板');
  };

  // 使用 VerificationCode 类型（字段: phone, code, codeType, sender, content, receivedAt, used）
  const columns: ColumnsType<VerificationCode> = [
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '验证码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => (
        <Space>
          <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>
            {code}
          </Tag>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleCopy(code)}
          >
            复制
          </Button>
        </Space>
      ),
    },
    {
      title: '服务名称',
      dataIndex: 'sender',
      key: 'sender',
      width: 120,
    },
    {
      title: '状态',
      dataIndex: 'used',
      key: 'used',
      width: 100,
      render: (used: boolean) => (
        <Tag color={used ? 'default' : 'green'}>
          {used ? '已使用' : '未使用'}
        </Tag>
      ),
    },
    {
      title: '接收时间',
      dataIndex: 'receivedAt',
      key: 'receivedAt',
      width: 180,
      render: (time: string) => (
        <div>
          <div>{dayjs(time).format('YYYY-MM-DD HH:mm:ss')}</div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {dayjs(time).fromNow()}
          </div>
        </div>
      ),
    },
    {
      title: '短信内容',
      dataIndex: 'messageText',
      key: 'messageText',
      ellipsis: true,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* 搜索区域 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <h3>查询验证码</h3>
            <p style={{ color: '#999', marginTop: 8 }}>
              输入虚拟手机号查询最新的验证码
            </p>
          </div>
          <Space.Compact style={{ width: '100%', maxWidth: 500 }}>
            <Input
              placeholder="请输入手机号 (例如: +1234567890)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onPressEnter={handleSearch}
              size="large"
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              size="large"
              loading={isLoading}
            >
              查询
            </Button>
          </Space.Compact>

          {/* 查询结果 */}
          {searchPhone && data && (
            <Card
              size="small"
              title="查询结果"
              extra={
                <Button
                  type="link"
                  icon={<ReloadOutlined />}
                  onClick={() => refetch()}
                >
                  刷新
                </Button>
              }
            >
              {data.hasActive ? (
                <div>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ fontSize: 16 }}>
                      <strong>状态：</strong>
                      <Tag color="green" style={{ marginLeft: 8 }}>
                        有活跃验证码
                      </Tag>
                    </div>
                    <div>
                      <strong>手机号：</strong> {data.phoneNumber}
                    </div>
                    <div>
                      <strong>验证码类型：</strong> {data.type}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      剩余有效时间：{data.remainingSeconds} 秒
                    </div>
                  </Space>
                </div>
              ) : (
                <Empty description="该号码暂无活跃验证码" />
              )}
            </Card>
          )}
        </Space>
      </Card>

      {/* 验证码历史 */}
      <Card
        title="我的验证码历史"
        extra={
          <Button type="link" icon={<ReloadOutlined />}>
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={getListData(historyData)}
          rowKey="id"
          loading={historyLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          locale={{
            emptyText: <Empty description="暂无验证码记录" />,
          }}
        />
      </Card>
    </div>
  );
};

export default SMSVerification;
