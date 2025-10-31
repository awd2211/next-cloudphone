import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Input,
  message,
  Popconfirm,
  Alert,
  Form,
  Modal,
} from 'antd';
import {
  DatabaseOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  getCacheStats,
  resetCacheStats,
  flushCache,
  deleteCache,
  deleteCachePattern,
  checkCacheExists,
} from '@/services/cache';
import type { CacheStats } from '@/types';

const CacheManagement = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteKeyModalVisible, setDeleteKeyModalVisible] = useState(false);
  const [deletePatternModalVisible, setDeletePatternModalVisible] = useState(false);
  const [checkKeyModalVisible, setCheckKeyModalVisible] = useState(false);
  const [checkResult, setCheckResult] = useState<{ key: string; exists: boolean } | null>(null);

  const [deleteForm] = Form.useForm();
  const [patternForm] = Form.useForm();
  const [checkForm] = Form.useForm();

  const loadStats = async () => {
    try {
      const res = await getCacheStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      message.error('加载缓存统计失败');
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000); // 每10秒刷新
    return () => clearInterval(interval);
  }, []);

  const handleResetStats = async () => {
    try {
      await resetCacheStats();
      message.success('统计已重置');
      await loadStats();
    } catch (error) {
      message.error('重置统计失败');
    }
  };

  const handleFlushCache = async () => {
    setLoading(true);
    try {
      await flushCache();
      message.success('所有缓存已清空');
      await loadStats();
    } catch (error) {
      message.error('清空缓存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async () => {
    try {
      const values = await deleteForm.validateFields();
      await deleteCache(values.key);
      message.success('缓存键已删除');
      deleteForm.resetFields();
      setDeleteKeyModalVisible(false);
      await loadStats();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleDeletePattern = async () => {
    try {
      const values = await patternForm.validateFields();
      const res = await deleteCachePattern(values.pattern);
      if (res.success) {
        message.success(`已删除 ${res.data.deletedCount} 个缓存键`);
        patternForm.resetFields();
        setDeletePatternModalVisible(false);
        await loadStats();
      }
    } catch (error) {
      message.error('批量删除失败');
    }
  };

  const handleCheckKey = async () => {
    try {
      const values = await checkForm.validateFields();
      const res = await checkCacheExists(values.key);
      if (res.success) {
        setCheckResult(res.data);
      }
    } catch (error) {
      message.error('检查失败');
    }
  };

  // 计算命中率进度条状态
  const getHitRateStatus = (rate: number) => {
    if (rate >= 80) return 'success';
    if (rate >= 50) return 'normal';
    return 'exception';
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="缓存管理"
          description="管理系统的两层缓存（L1: NodeCache 内存, L2: Redis）。可以查看统计信息、清空缓存、删除指定键等。"
          type="info"
          showIcon
        />

        {/* 统计信息卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="L1 命中数"
                value={stats?.l1Hits || 0}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="L2 命中数"
                value={stats?.l2Hits || 0}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="未命中数"
                value={stats?.misses || 0}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="总请求数" value={stats?.totalRequests || 0} />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="命中率"
                value={stats?.hitRate || 0}
                precision={2}
                suffix="%"
                valueStyle={{
                  color:
                    stats && stats.hitRate >= 80
                      ? '#52c41a'
                      : stats && stats.hitRate >= 50
                        ? '#1890ff'
                        : '#ff4d4f',
                }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="未命中率" value={stats?.missRate || 0} precision={2} suffix="%" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="L1 缓存大小" value={stats?.l1Size || 0} suffix="keys" />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="L2 缓存大小" value={stats?.l2Size || 0} suffix="keys" />
            </Card>
          </Col>
        </Row>

        {/* 操作按钮 */}
        <Card title="缓存操作">
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={loadStats} loading={loading}>
              刷新统计
            </Button>

            <Button icon={<ReloadOutlined />} onClick={handleResetStats}>
              重置统计
            </Button>

            <Button icon={<DeleteOutlined />} onClick={() => setDeleteKeyModalVisible(true)}>
              删除指定键
            </Button>

            <Button icon={<ClearOutlined />} onClick={() => setDeletePatternModalVisible(true)}>
              按模式删除
            </Button>

            <Button icon={<SearchOutlined />} onClick={() => setCheckKeyModalVisible(true)}>
              检查键存在
            </Button>

            <Popconfirm
              title="清空所有缓存"
              description="此操作将清空 L1 和 L2 的所有缓存数据，确定继续？"
              onConfirm={handleFlushCache}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<ClearOutlined />} loading={loading}>
                清空所有缓存
              </Button>
            </Popconfirm>
          </Space>
        </Card>

        {/* 说明信息 */}
        <Card title="缓存说明">
          <Space direction="vertical" size="small">
            <div>
              <strong>L1 缓存 (NodeCache):</strong> 内存级缓存，速度最快，适合频繁访问的热数据
            </div>
            <div>
              <strong>L2 缓存 (Redis):</strong> 分布式缓存，支持跨进程共享，持久化存储
            </div>
            <div>
              <strong>缓存策略:</strong> 先查 L1，未命中查 L2，再未命中查数据库并回填缓存
            </div>
            <div>
              <strong>性能指标:</strong>
              <ul style={{ marginTop: 8 }}>
                <li>命中率 ≥ 80%: 优秀 (绿色)</li>
                <li>命中率 50-80%: 正常 (蓝色)</li>
                <li>命中率 &lt; 50%: 需优化 (红色)</li>
              </ul>
            </div>
          </Space>
        </Card>
      </Space>

      {/* 删除指定键 Modal */}
      <Modal
        title="删除指定缓存键"
        open={deleteKeyModalVisible}
        onOk={handleDeleteKey}
        onCancel={() => {
          setDeleteKeyModalVisible(false);
          deleteForm.resetFields();
        }}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Form form={deleteForm} layout="vertical">
          <Form.Item
            name="key"
            label="缓存键"
            rules={[{ required: true, message: '请输入缓存键' }]}
          >
            <Input placeholder="例如: user:123, device:456" />
          </Form.Item>
          <Alert
            message="提示"
            description="请输入完整的缓存键名称，删除后无法恢复。"
            type="warning"
            showIcon
            style={{ marginTop: 8 }}
          />
        </Form>
      </Modal>

      {/* 按模式删除 Modal */}
      <Modal
        title="按模式批量删除"
        open={deletePatternModalVisible}
        onOk={handleDeletePattern}
        onCancel={() => {
          setDeletePatternModalVisible(false);
          patternForm.resetFields();
        }}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Form form={patternForm} layout="vertical">
          <Form.Item
            name="pattern"
            label="匹配模式"
            rules={[{ required: true, message: '请输入匹配模式' }]}
          >
            <Input placeholder="例如: user:*, session:123*" />
          </Form.Item>
          <Alert
            message="支持的通配符"
            description={
              <div>
                <div>
                  <code>*</code> - 匹配任意数量的字符
                </div>
                <div>
                  <code>?</code> - 匹配单个字符
                </div>
                <div>
                  示例: <code>user:*</code> 匹配所有以 user: 开头的键
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        </Form>
      </Modal>

      {/* 检查键存在 Modal */}
      <Modal
        title="检查缓存键是否存在"
        open={checkKeyModalVisible}
        onOk={handleCheckKey}
        onCancel={() => {
          setCheckKeyModalVisible(false);
          checkForm.resetFields();
          setCheckResult(null);
        }}
        okText="检查"
        cancelText="关闭"
      >
        <Form form={checkForm} layout="vertical">
          <Form.Item
            name="key"
            label="缓存键"
            rules={[{ required: true, message: '请输入缓存键' }]}
          >
            <Input placeholder="例如: user:123" />
          </Form.Item>
        </Form>

        {checkResult && (
          <Alert
            message={checkResult.exists ? '键存在' : '键不存在'}
            description={`缓存键: ${checkResult.key}`}
            type={checkResult.exists ? 'success' : 'warning'}
            showIcon
            icon={checkResult.exists ? <CheckCircleOutlined /> : undefined}
            style={{ marginTop: 16 }}
          />
        )}
      </Modal>
    </div>
  );
};

export default CacheManagement;
