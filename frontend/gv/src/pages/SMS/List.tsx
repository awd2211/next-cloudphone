import { useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  message,
  Typography,
  Empty,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  CopyOutlined,
  CheckOutlined,
  MessageOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { smsApi } from '@/services/api';
import type { VerificationCode } from '@/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

const SMSList = () => {
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 获取验证码列表
  const { data: codesData, isLoading, refetch } = useQuery({
    queryKey: ['smsCodes'],
    queryFn: () => smsApi.list({ page: 1, pageSize: 20 }),
  });

  // 按手机号查询
  const { data: queryResult, isLoading: isQuerying } = useQuery({
    queryKey: ['smsQuery', searchPhone],
    queryFn: () => smsApi.queryByPhone(searchPhone),
    enabled: !!searchPhone,
  });

  // 标记已使用
  const markUsedMutation = useMutation({
    mutationFn: smsApi.markUsed,
    onSuccess: () => {
      message.success('已标记为已使用');
      queryClient.invalidateQueries({ queryKey: ['smsCodes'] });
    },
  });

  // 处理搜索
  const handleSearch = () => {
    if (!phoneNumber.trim()) {
      message.warning('请输入手机号');
      return;
    }
    setSearchPhone(phoneNumber.trim());
  };

  // 复制验证码
  const handleCopy = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    message.success('验证码已复制');
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // 表格列定义
  const columns: ColumnsType<VerificationCode> = [
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 160,
      render: (phone: string) => (
        <Space>
          <PhoneOutlined style={{ color: '#1677ff' }} />
          <span style={{ fontFamily: 'monospace' }}>{phone}</span>
        </Space>
      ),
    },
    {
      title: '验证码',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string, record) => (
        <Space>
          <Tag
            color="blue"
            style={{
              fontSize: 16,
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '4px 12px',
            }}
          >
            {code}
          </Tag>
          <Tooltip title="复制验证码">
            <Button
              type="text"
              size="small"
              icon={copiedId === record.id ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
              onClick={() => handleCopy(code, record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '来源',
      dataIndex: 'sender',
      key: 'sender',
      width: 120,
      render: (sender: string) => (
        <Tag icon={<MessageOutlined />}>{sender}</Tag>
      ),
    },
    {
      title: '类型',
      dataIndex: 'codeType',
      key: 'codeType',
      width: 100,
      render: (type: string) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          register: { text: '注册', color: 'green' },
          login: { text: '登录', color: 'blue' },
          verify: { text: '验证', color: 'orange' },
          password_reset: { text: '重置密码', color: 'red' },
        };
        const config = typeMap[type] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'used',
      key: 'used',
      width: 100,
      render: (used: boolean) => (
        <Tag color={used ? 'default' : 'success'}>
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
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Tooltip title={content}>
          <span style={{ color: '#666' }}>{content}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        !record.used && (
          <Button
            type="link"
            size="small"
            onClick={() => markUsedMutation.mutate(record.id)}
          >
            标记已用
          </Button>
        )
      ),
    },
  ];

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          验证码接收
        </Title>
        <Text type="secondary">接收并管理应用验证码</Text>
      </div>

      {/* 搜索区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={5} style={{ margin: 0 }}>
              快速查询
            </Title>
            <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
              输入手机号查询最新验证码
            </Text>
          </div>

          <Space.Compact style={{ width: '100%', maxWidth: 500 }}>
            <Input
              placeholder="请输入手机号 (例如: +1 555)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onPressEnter={handleSearch}
              size="large"
              prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
            />
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              size="large"
              loading={isQuerying}
            >
              查询
            </Button>
          </Space.Compact>

          {/* 查询结果 */}
          {searchPhone && queryResult && (
            <Card
              size="small"
              title="查询结果"
              style={{ background: queryResult.hasActive ? '#f6ffed' : '#fff' }}
            >
              {queryResult.hasActive ? (
                <div>
                  <Tag color="success" style={{ marginBottom: 8 }}>
                    <CheckOutlined /> 有活跃验证码
                  </Tag>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong>手机号：</Text>
                    <Text code>{queryResult.phoneNumber}</Text>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong>类型：</Text>
                    <Text>{queryResult.type}</Text>
                  </div>
                  <div>
                    <Text strong>剩余有效时间：</Text>
                    <Text type="warning">{queryResult.remainingSeconds} 秒</Text>
                  </div>
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="该号码暂无活跃验证码"
                />
              )}
            </Card>
          )}
        </Space>
      </Card>

      {/* 验证码列表 */}
      <Card
        title="验证码历史"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            刷新
          </Button>
        }
      >
        <Table<VerificationCode>
          columns={columns}
          dataSource={codesData?.data || []}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1100 }}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: <Empty description="暂无验证码记录" />,
          }}
        />
      </Card>
    </div>
  );
};

export default SMSList;
