import { useState, useEffect } from 'react';
import { Card, Row, Col, Button, InputNumber, message, Steps, Modal, QRCode, Spin } from 'antd';
import { DollarOutlined, WechatOutlined, AlipayOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { recharge } from '@/services/user';
import { createPayment, queryPaymentStatus } from '@/services/order';
import type { Payment } from '@/types';

const Recharge = () => {
  const [amount, setAmount] = useState<number>(100);
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleNext = () => {
    if (currentStep === 0) {
      if (!amount || amount < 1) {
        message.error('请输入有效的充值金额');
        return;
      }
      setCurrentStep(1);
    }
  };

  const handleRecharge = async () => {
    setLoading(true);
    try {
      // 创建充值订单（这里简化处理，实际应该先创建充值订单）
      const orderId = 'recharge-' + Date.now(); // 临时订单ID

      const newPayment = await createPayment({
        orderId,
        method: paymentMethod,
      });

      setPayment(newPayment);
      setQrModalVisible(true);
      startPolling(newPayment.paymentNo);
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
          message.success('充值成功');
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

  const steps = [
    { title: '选择金额', description: '输入充值金额' },
    { title: '选择支付方式', description: '完成支付' },
    { title: '完成', description: '充值成功' },
  ];

  return (
    <div>
      <h2>账户充值</h2>

      <Steps current={currentStep} items={steps} style={{ marginBottom: 48 }} />

      {currentStep === 0 && (
        <Card title="选择充值金额">
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>
              快捷金额：
            </div>
            <Row gutter={[16, 16]}>
              {quickAmounts.map((amt) => (
                <Col key={amt} span={8}>
                  <Button
                    size="large"
                    block
                    type={amount === amt ? 'primary' : 'default'}
                    onClick={() => setAmount(amt)}
                    style={{ height: 60, fontSize: 18 }}
                  >
                    ¥{amt}
                  </Button>
                </Col>
              ))}
            </Row>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>
              自定义金额：
            </div>
            <InputNumber
              size="large"
              value={amount}
              onChange={(val) => setAmount(val || 0)}
              min={1}
              max={100000}
              precision={2}
              prefix="¥"
              style={{ width: '100%', fontSize: 24 }}
              placeholder="请输入充值金额"
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <Button type="primary" size="large" onClick={handleNext}>
              下一步
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 1 && (
        <Card title="选择支付方式">
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                padding: 24,
                background: '#f0f2f5',
                borderRadius: 8,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                充值金额
              </div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#f5222d' }}>
                ¥{amount.toFixed(2)}
              </div>
            </div>

            <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>
              选择支付方式：
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Card
                  hoverable
                  style={{
                    border: paymentMethod === 'wechat' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPaymentMethod('wechat')}
                >
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <WechatOutlined style={{ fontSize: 48, color: '#09bb07' }} />
                    <div style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold' }}>
                      微信支付
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card
                  hoverable
                  style={{
                    border: paymentMethod === 'alipay' ? '2px solid #1890ff' : '1px solid #d9d9d9',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPaymentMethod('alipay')}
                >
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <AlipayOutlined style={{ fontSize: 48, color: '#1677ff' }} />
                    <div style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold' }}>
                      支付宝
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>

          <div style={{ textAlign: 'right' }}>
            <Button size="large" onClick={() => setCurrentStep(0)} style={{ marginRight: 12 }}>
              上一步
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<DollarOutlined />}
              onClick={handleRecharge}
              loading={loading}
            >
              立即充值
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <CheckCircleOutlined
              style={{ fontSize: 72, color: '#52c41a', marginBottom: 24 }}
            />
            <h2 style={{ fontSize: 28, marginBottom: 16 }}>充值成功！</h2>
            <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
              ¥{amount.toFixed(2)} 已充值到您的账户
            </p>
            <Button type="primary" size="large" onClick={() => window.location.href = '/profile'}>
              查看余额
            </Button>
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
            <p style={{ color: '#999' }}>金额: ¥{amount.toFixed(2)}</p>
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

export default Recharge;
