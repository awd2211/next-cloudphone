import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Steps,
  Radio,
  Space,
  message,
  Modal,
  QRCode,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getPlan } from '@/services/plan';
import { createOrder, createPayment, queryPaymentStatus } from '@/services/order';
import type { Plan, Order, Payment } from '@/types';
import dayjs from 'dayjs';

const PlanPurchaseContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay' | 'balance'>('wechat');
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const loadPlan = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getPlan(id);
      setPlan(data);
    } catch (error) {
      message.error('加载套餐失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        loadPlan();
        message.info('刷新套餐信息');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadPlan]);

  const handleCreateOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const newOrder = await createOrder({ planId: id });
      setOrder(newOrder);
      setCurrentStep(1);
      message.success('订单创建成功');
    } catch (error) {
      message.error('创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const newPayment = await createPayment({
        orderId: order.id,
        method: paymentMethod,
      });
      setPayment(newPayment);

      if (paymentMethod === 'balance') {
        // 余额支付直接完成
        message.success('支付成功');
        setCurrentStep(2);
      } else {
        // 扫码支付
        setQrModalVisible(true);
        startPolling(newPayment.paymentNo);
      }
    } catch (error) {
      message.error('创建支付失败');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (paymentNo: string) => {
    // 清理之前的轮询
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const result = await queryPaymentStatus(paymentNo);
        if (result.status === 'success') {
          clearInterval(interval);
          setPollingInterval(null);
          setPolling(false);
          setQrModalVisible(false);
          message.success('支付成功');
          setCurrentStep(2);
        } else if (result.status === 'failed' || result.status === 'cancelled') {
          clearInterval(interval);
          setPollingInterval(null);
          setPolling(false);
          setQrModalVisible(false);
          message.error('支付失败');
        }
      } catch (error) {
        // 继续轮询
      }
    }, 3000);
    setPollingInterval(interval);
  };

  if (!plan) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  const steps = [
    { title: '确认套餐', description: '确认购买信息' },
    { title: '选择支付方式', description: '完成支付' },
    { title: '完成', description: '购买成功' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 24 }}
      >
        返回
      </Button>

      <Steps current={currentStep} items={steps} style={{ marginBottom: 48 }} />

      {currentStep === 0 && (
        <Card title="确认套餐信息">
          <Descriptions column={1} bordered>
            <Descriptions.Item label="套餐名称">{plan.name}</Descriptions.Item>
            <Descriptions.Item label="套餐类型">
              {plan.type === 'monthly' && '月付'}
              {plan.type === 'yearly' && '年付'}
              {plan.type === 'one-time' && '一次性'}
            </Descriptions.Item>
            <Descriptions.Item label="价格">
              <span style={{ fontSize: 24, color: '#1890ff', fontWeight: 'bold' }}>
                ¥{plan.price.toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="有效期">{plan.duration} 天</Descriptions.Item>
            <Descriptions.Item label="设备数量">最多 {plan.deviceLimit} 个</Descriptions.Item>
            {plan.description && (
              <Descriptions.Item label="套餐说明">{plan.description}</Descriptions.Item>
            )}
          </Descriptions>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button type="primary" size="large" onClick={handleCreateOrder} loading={loading}>
              确认并创建订单
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 1 && order && (
        <Card title="选择支付方式">
          <Descriptions column={1} bordered style={{ marginBottom: 24 }}>
            <Descriptions.Item label="订单号">{order.orderNo}</Descriptions.Item>
            <Descriptions.Item label="订单金额">
              <span style={{ fontSize: 20, color: '#f5222d', fontWeight: 'bold' }}>
                ¥{order.amount.toFixed(2)}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 12, fontWeight: 'bold' }}>支付方式：</div>
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              size="large"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Radio
                  value="wechat"
                  style={{
                    width: '100%',
                    padding: 16,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                  }}
                >
                  <Space>
                    <span style={{ fontSize: 24 }}>💚</span>
                    <span style={{ fontSize: 16 }}>微信支付</span>
                  </Space>
                </Radio>
                <Radio
                  value="alipay"
                  style={{
                    width: '100%',
                    padding: 16,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                  }}
                >
                  <Space>
                    <span style={{ fontSize: 24 }}>💙</span>
                    <span style={{ fontSize: 16 }}>支付宝</span>
                  </Space>
                </Radio>
                <Radio
                  value="balance"
                  style={{
                    width: '100%',
                    padding: 16,
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                  }}
                >
                  <Space>
                    <span style={{ fontSize: 24 }}>💰</span>
                    <span style={{ fontSize: 16 }}>余额支付</span>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Button size="large" onClick={() => setCurrentStep(0)} style={{ marginRight: 12 }}>
              上一步
            </Button>
            <Button type="primary" size="large" onClick={handlePayment} loading={loading}>
              立即支付
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a', marginBottom: 24 }} />
            <h2 style={{ fontSize: 28, marginBottom: 16 }}>购买成功！</h2>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
              感谢您的购买，您现在可以开始使用云手机了
            </p>
            <Space size="large">
              <Button size="large" onClick={() => navigate('/devices')}>
                我的设备
              </Button>
              <Button type="primary" size="large" onClick={() => navigate('/orders')}>
                查看订单
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 支付二维码弹窗 */}
      <Modal
        title={`${paymentMethod === 'wechat' ? '微信' : '支付宝'}扫码支付`}
        open={qrModalVisible}
        onCancel={() => {
          setQrModalVisible(false);
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setPolling(false);
        }}
        footer={null}
      >
        {payment?.paymentUrl && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <QRCode value={payment.paymentUrl} size={256} />
            <p style={{ marginTop: 24, fontSize: 16 }}>
              请使用{paymentMethod === 'wechat' ? '微信' : '支付宝'}扫码支付
            </p>
            <p style={{ color: '#999' }}>金额: ¥{order?.amount.toFixed(2)}</p>
            {polling && (
              <p style={{ color: '#1890ff', marginTop: 16 }}>
                <Spin size="small" style={{ marginRight: 8 }} />
                等待支付中...
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const PlanPurchase = () => {
  return (
    <ErrorBoundary>
      <PlanPurchaseContent />
    </ErrorBoundary>
  );
};

export default PlanPurchase;
