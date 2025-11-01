import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Descriptions,
  Tag,
  message,
  Tabs,
  Modal,
  Form,
  Upload,
  List,
  Popconfirm,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import {
  getDevice,
  startDevice,
  stopDevice,
  rebootDevice,
  installApp,
  uninstallApp,
  getInstalledPackages,
  takeScreenshot,
} from '@/services/device';
import type { Device } from '@/types';
import dayjs from 'dayjs';
import { WebRTCPlayerLazy, ADBConsoleLazy } from '@/components/LazyComponents';
import { AppOperationModal } from '@/components/DeviceAppOperations';
import {
  CreateSnapshotModal,
  RestoreSnapshotModal,
  SnapshotListTable,
} from '@/components/DeviceSnapshot';

const DeviceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);
  const [installedApps, setInstalledApps] = useState<string[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  // 应用操作相关状态
  const [appOperationModalVisible, setAppOperationModalVisible] = useState(false);
  const [appOperationType, setAppOperationType] = useState<'start' | 'stop' | 'clear-data'>('start');

  // 快照管理相关状态
  const [createSnapshotModalVisible, setCreateSnapshotModalVisible] = useState(false);
  const [restoreSnapshotModalVisible, setRestoreSnapshotModalVisible] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>();
  const [selectedSnapshotName, setSelectedSnapshotName] = useState<string>();

  const loadDevice = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getDevice(id);
      setDevice(data);
    } catch (error) {
      message.error('加载设备信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledApps = async () => {
    if (!id) return;
    try {
      const packages = await getInstalledPackages(id);
      // 提取包名
      const appNames = packages.map((pkg) => pkg.name);
      setInstalledApps(appNames);
    } catch (error) {
      message.error('加载已安装应用失败');
    }
  };

  useEffect(() => {
    loadDevice();
    loadInstalledApps();
  }, [id]);

  const handleStart = async () => {
    if (!id) return;
    try {
      await startDevice(id);
      message.success('设备启动成功');
      loadDevice();
    } catch (error) {
      message.error('设备启动失败');
    }
  };

  const handleStop = async () => {
    if (!id) return;
    try {
      await stopDevice(id);
      message.success('设备停止成功');
      loadDevice();
    } catch (error) {
      message.error('设备停止失败');
    }
  };

  const handleRestart = async () => {
    if (!id) return;
    try {
      await rebootDevice(id);
      message.success('设备重启成功');
      loadDevice();
    } catch (error) {
      message.error('设备重启失败');
    }
  };

  const handleScreenshot = async () => {
    if (!id) return;
    try {
      const blob = await takeScreenshot(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `screenshot-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('截图成功');
    } catch (error) {
      message.error('截图失败');
    }
  };

  const handleUploadApp = async () => {
    if (!id || fileList.length === 0) return;
    const file = fileList[0].originFileObj;
    if (!file) return;

    try {
      await installApp(id, file);
      message.success('应用安装成功');
      setUploadModalVisible(false);
      setFileList([]);
      form.resetFields();
      loadInstalledApps();
    } catch (error) {
      message.error('应用安装失败');
    }
  };

  const handleUninstallApp = async (packageName: string) => {
    if (!id) return;
    try {
      await uninstallApp(id, packageName);
      message.success('应用卸载成功');
      loadInstalledApps();
    } catch (error) {
      message.error('应用卸载失败');
    }
  };

  // 应用操作处理函数
  const handleOpenAppOperation = (type: 'start' | 'stop' | 'clear-data') => {
    setAppOperationType(type);
    setAppOperationModalVisible(true);
  };

  const handleAppOperationSuccess = () => {
    setAppOperationModalVisible(false);
    loadDevice();
  };

  // 快照管理处理函数
  const handleCreateSnapshotSuccess = () => {
    setCreateSnapshotModalVisible(false);
    message.success('快照创建成功');
  };

  const handleRestoreSnapshot = (snapshotId: string, snapshotName: string) => {
    setSelectedSnapshotId(snapshotId);
    setSelectedSnapshotName(snapshotName);
    setRestoreSnapshotModalVisible(true);
  };

  const handleRestoreSnapshotSuccess = () => {
    setRestoreSnapshotModalVisible(false);
    setSelectedSnapshotId(undefined);
    setSelectedSnapshotName(undefined);
    message.success('快照恢复成功，设备将重启');
    setTimeout(() => {
      loadDevice();
    }, 3000);
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      idle: { color: 'default', text: '空闲' },
      running: { color: 'green', text: '运行中' },
      stopped: { color: 'red', text: '已停止' },
      error: { color: 'red', text: '错误' },
    };
    const config = statusMap[status] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  if (!device) {
    return <div>加载中...</div>;
  }

  const tabItems = [
    {
      key: 'screen',
      label: '设备屏幕',
      children: (
        <Card>
          {device.status === 'running' ? (
            <WebRTCPlayerLazy deviceId={id!} />
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 0', color: '#999' }}>
              设备未运行，无法显示屏幕
            </div>
          )}
        </Card>
      ),
    },
    {
      key: 'console',
      label: 'ADB 控制台',
      children: (
        <Card>
          <ADBConsoleLazy deviceId={id!} />
        </Card>
      ),
    },
    {
      key: 'apps',
      label: '应用管理',
      children: (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              安装应用
            </Button>
          </div>
          <List
            dataSource={installedApps}
            renderItem={(app) => (
              <List.Item
                actions={[
                  <Popconfirm
                    key="uninstall"
                    title="确定要卸载这个应用吗？"
                    onConfirm={() => handleUninstallApp(app)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button type="link" danger icon={<DeleteOutlined />}>
                      卸载
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta title={app} />
              </List.Item>
            )}
          />
        </Card>
      ),
    },
    {
      key: 'app-operations',
      label: '应用操作',
      children: (
        <Card>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleOpenAppOperation('start')}
              disabled={device?.status !== 'running'}
            >
              启动应用
            </Button>
            <Button
              icon={<PauseCircleOutlined />}
              onClick={() => handleOpenAppOperation('stop')}
              disabled={device?.status !== 'running'}
            >
              停止应用
            </Button>
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleOpenAppOperation('clear-data')}
              disabled={device?.status !== 'running'}
            >
              清除应用数据
            </Button>
          </Space>
          <div style={{ marginTop: 16, color: '#999' }}>
            <p>💡 提示:</p>
            <ul>
              <li>这些功能仅支持阿里云 ECP 平台的设备</li>
              <li>设备必须处于运行状态才能执行应用操作</li>
              <li>需要输入应用的包名（例如: com.tencent.mm）</li>
            </ul>
          </div>
        </Card>
      ),
    },
    {
      key: 'snapshots',
      label: '快照管理',
      children: (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              onClick={() => setCreateSnapshotModalVisible(true)}
            >
              创建快照
            </Button>
          </div>
          <SnapshotListTable deviceId={id!} onRestore={handleRestoreSnapshot} />
          <div style={{ marginTop: 16, color: '#999' }}>
            <p>💡 提示:</p>
            <ul>
              <li>快照功能仅支持阿里云 ECP 平台的设备</li>
              <li>快照会保存设备的完整状态，包括系统和数据</li>
              <li>恢复快照会覆盖设备当前的所有数据</li>
            </ul>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/devices')}>
          返回列表
        </Button>
      </div>

      <Card title="设备信息" loading={loading} style={{ marginBottom: 16 }}>
        <Descriptions column={2}>
          <Descriptions.Item label="设备名称">{device.name}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(device.status)}</Descriptions.Item>
          <Descriptions.Item label="Android 版本">{device.androidVersion}</Descriptions.Item>
          <Descriptions.Item label="CPU 核心数">{device.cpuCores}</Descriptions.Item>
          <Descriptions.Item label="内存">{device.memoryMB} MB</Descriptions.Item>
          <Descriptions.Item label="存储">{device.storageMB} MB</Descriptions.Item>
          <Descriptions.Item label="IP 地址">{device.ipAddress || '-'}</Descriptions.Item>
          <Descriptions.Item label="ADB 端口">{device.adbPort || '-'}</Descriptions.Item>
          <Descriptions.Item label="VNC 端口">{device.vncPort || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(device.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="最后启动时间">
            {device.lastStartedAt ? dayjs(device.lastStartedAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="最后停止时间">
            {device.lastStoppedAt ? dayjs(device.lastStoppedAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 16 }}>
          <Space>
            {device.status !== 'running' && (
              <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}>
                启动
              </Button>
            )}
            {device.status === 'running' && (
              <>
                <Button icon={<PauseCircleOutlined />} onClick={handleStop}>
                  停止
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleRestart}>
                  重启
                </Button>
              </>
            )}
            <Button onClick={handleScreenshot}>截图</Button>
          </Space>
        </div>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* 上传应用对话框 */}
      <Modal
        title="安装应用"
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setFileList([]);
          form.resetFields();
        }}
        onOk={handleUploadApp}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="APK 文件" required>
            <Upload
              fileList={fileList}
              beforeUpload={(file) => {
                if (!file.name.endsWith('.apk')) {
                  message.error('只能上传 APK 文件');
                  return false;
                }
                setFileList([file]);
                return false;
              }}
              onRemove={() => setFileList([])}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择 APK 文件</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 应用操作对话框 */}
      <AppOperationModal
        visible={appOperationModalVisible}
        deviceId={id!}
        deviceName={device?.name || ''}
        operationType={appOperationType}
        onClose={() => setAppOperationModalVisible(false)}
        onSuccess={handleAppOperationSuccess}
      />

      {/* 创建快照对话框 */}
      <CreateSnapshotModal
        visible={createSnapshotModalVisible}
        deviceId={id!}
        deviceName={device?.name || ''}
        onClose={() => setCreateSnapshotModalVisible(false)}
        onSuccess={handleCreateSnapshotSuccess}
      />

      {/* 恢复快照对话框 */}
      <RestoreSnapshotModal
        visible={restoreSnapshotModalVisible}
        deviceId={id!}
        deviceName={device?.name || ''}
        snapshotId={selectedSnapshotId}
        snapshotName={selectedSnapshotName}
        onClose={() => {
          setRestoreSnapshotModalVisible(false);
          setSelectedSnapshotId(undefined);
          setSelectedSnapshotName(undefined);
        }}
        onSuccess={handleRestoreSnapshotSuccess}
      />
    </div>
  );
};

export default DeviceDetail;
