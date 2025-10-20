import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Descriptions, Tag, message, Row, Col, Statistic } from 'antd';
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { getDevice, startDevice, stopDevice, rebootDevice } from '@/services/device';
import type { Device } from '@/types';
import dayjs from 'dayjs';

const DeviceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadDevice();
    // 每30秒刷新一次设备状态
    const interval = setInterval(loadDevice, 30000);
    return () => clearInterval(interval);
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

  const handleReboot = async () => {
    if (!id) return;
    try {
      await rebootDevice(id);
      message.success('设备重启中...');
      setTimeout(() => loadDevice(), 2000);
    } catch (error) {
      message.error('设备重启失败');
    }
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

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/devices')}
        style={{ marginBottom: 24 }}
      >
        返回设备列表
      </Button>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="设备状态"
              value={getStatusTag(device.status).text}
              valueStyle={{
                color: device.status === 'running' ? '#3f8600' : '#999',
              }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="CPU 核心数"
              value={device.cpuCores}
              suffix="核"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="内存"
              value={(device.memoryMB / 1024).toFixed(1)}
              suffix="GB"
            />
          </Card>
        </Col>
      </Row>

      <Card title="设备信息" loading={loading} style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="设备名称">{device.name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            {getStatusTag(device.status)}
          </Descriptions.Item>
          <Descriptions.Item label="Android 版本">
            {device.androidVersion}
          </Descriptions.Item>
          <Descriptions.Item label="CPU 核心数">
            {device.cpuCores}
          </Descriptions.Item>
          <Descriptions.Item label="内存">
            {device.memoryMB} MB
          </Descriptions.Item>
          <Descriptions.Item label="存储">
            {device.storageMB} MB
          </Descriptions.Item>
          <Descriptions.Item label="IP 地址">
            {device.ipAddress || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="VNC 端口">
            {device.vncPort || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(device.createdAt).format('YYYY-MM-DD HH:mm')}
          </Descriptions.Item>
          <Descriptions.Item label="最后启动时间">
            {device.lastStartedAt
              ? dayjs(device.lastStartedAt).format('YYYY-MM-DD HH:mm')
              : '-'}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 24 }}>
          {device.status !== 'running' ? (
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStart}
            >
              启动设备
            </Button>
          ) : (
            <>
              <Button
                size="large"
                icon={<PauseCircleOutlined />}
                onClick={handleStop}
                style={{ marginRight: 12 }}
              >
                停止设备
              </Button>
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={handleReboot}
              >
                重启设备
              </Button>
            </>
          )}
        </div>
      </Card>

      {device.status === 'running' && (
        <Card title="设备屏幕">
          <div
            style={{
              background: '#000',
              borderRadius: 8,
              padding: 16,
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#fff', padding: '100px 0' }}>
              <p style={{ fontSize: 18, marginBottom: 16 }}>设备正在运行中</p>
              <p style={{ color: '#999' }}>
                WebRTC 实时投屏功能即将上线，敬请期待！
              </p>
            </div>
          </div>
        </Card>
      )}

      {device.status !== 'running' && (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
            <p style={{ fontSize: 18, marginBottom: 16 }}>设备未运行</p>
            <p>请先启动设备后再进行操作</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DeviceDetail;
