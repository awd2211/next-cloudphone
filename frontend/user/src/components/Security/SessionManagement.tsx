import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Tag,
  Space,
  Typography,
  Alert,
  Modal,
  Tooltip,
  Empty,
  message,
} from 'antd';
import {
  LaptopOutlined,
  MobileOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import { getActiveSessions, terminateSession, terminateAllSessions } from '@/services/auth';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text } = Typography;

interface Session {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActivity: string;
  isCurrent: boolean;
}

/**
 * 会话管理组件
 *
 * 功能：
 * 1. 显示所有活跃会话
 * 2. 标识当前会话
 * 3. 终止单个会话
 * 4. 终止所有其他会话
 */
export const SessionManagement: React.FC = React.memo(() => {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await getActiveSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // 终止单个会话
  const handleTerminateSession = (sessionId: string) => {
    Modal.confirm({
      title: '确认终止会话',
      icon: <ExclamationCircleOutlined />,
      content: '终止此会话后，该设备将需要重新登录。确定要继续吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        setTerminatingId(sessionId);
        try {
          await terminateSession(sessionId);
          message.success('会话已终止');
          await fetchSessions();
        } catch (error: any) {
          message.error(error.response?.data?.message || '终止失败');
        } finally {
          setTerminatingId(null);
        }
      },
    });
  };

  // 终止所有其他会话
  const handleTerminateAllOthers = () => {
    const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

    if (otherSessionsCount === 0) {
      message.info('没有其他活跃会话');
      return;
    }

    Modal.confirm({
      title: '确认终止所有其他会话',
      icon: <ExclamationCircleOutlined />,
      content: `将终止其他 ${otherSessionsCount} 个会话，这些设备将需要重新登录。确定要继续吗？`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoading(true);
        try {
          await terminateAllSessions();
          message.success('已终止所有其他会话');
          await fetchSessions();
        } catch (error: any) {
          message.error(error.response?.data?.message || '操作失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 获取设备图标
  const getDeviceIcon = (device: string) => {
    const lowerDevice = device.toLowerCase();
    if (
      lowerDevice.includes('mobile') ||
      lowerDevice.includes('android') ||
      lowerDevice.includes('ios')
    ) {
      return <MobileOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
    }
    return <LaptopOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Alert
        message="会话管理"
        description="这里显示了您账户当前所有活跃的登录会话。您可以查看每个会话的详细信息，并终止可疑的会话。"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Space>
          <Text strong>当前活跃会话：</Text>
          <Tag color="blue">{sessions.length} 个</Tag>
        </Space>
        <Button
          danger
          icon={<LogoutOutlined />}
          onClick={handleTerminateAllOthers}
          disabled={sessions.filter((s) => !s.isCurrent).length === 0}
        >
          终止所有其他会话
        </Button>
      </div>

      <List
        loading={loading}
        dataSource={sessions}
        locale={{
          emptyText: (
            <Empty
              description="暂无活跃会话"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        renderItem={(session) => (
          <Card
            style={{
              marginBottom: 16,
              border: session.isCurrent ? '2px solid #1890ff' : undefined,
            }}
            hoverable={!session.isCurrent}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Space size="large" style={{ flex: 1 }}>
                {getDeviceIcon(session.device)}
                <div style={{ flex: 1 }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space>
                      <Text strong>{session.device}</Text>
                      {session.isCurrent && (
                        <Tag
                          icon={<CheckCircleOutlined />}
                          color="success"
                        >
                          当前会话
                        </Tag>
                      )}
                    </Space>

                    <Space size="large">
                      <Space size={4}>
                        <Text type="secondary">浏览器:</Text>
                        <Text>{session.browser}</Text>
                      </Space>
                      <Space size={4}>
                        <EnvironmentOutlined style={{ color: '#8c8c8c' }} />
                        <Text type="secondary">{session.location}</Text>
                      </Space>
                    </Space>

                    <Space size="large">
                      <Space size={4}>
                        <Text type="secondary">IP:</Text>
                        <Text code copyable>
                          {session.ipAddress}
                        </Text>
                      </Space>
                      <Space size={4}>
                        <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                        <Tooltip
                          title={dayjs(session.lastActivity).format(
                            'YYYY-MM-DD HH:mm:ss'
                          )}
                        >
                          <Text type="secondary">
                            最后活动: {dayjs(session.lastActivity).fromNow()}
                          </Text>
                        </Tooltip>
                      </Space>
                    </Space>
                  </Space>
                </div>
              </Space>

              {!session.isCurrent && (
                <Button
                  danger
                  type="text"
                  icon={<LogoutOutlined />}
                  loading={terminatingId === session.id}
                  onClick={() => handleTerminateSession(session.id)}
                >
                  终止
                </Button>
              )}
            </div>
          </Card>
        )}
      />

      <Alert
        message="安全提示"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
            <li>定期检查活跃会话，确保所有会话都是您本人创建的</li>
            <li>如果发现未经授权的会话，立即终止并修改密码</li>
            <li>不要在公共设备上使用"记住我"功能</li>
            <li>使用完毕后及时退出登录，特别是在共享设备上</li>
          </ul>
        }
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
      />
    </div>
  );
});

SessionManagement.displayName = 'SessionManagement';
