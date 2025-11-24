import { useState } from 'react';
import { Card, Row, Col, Button, InputNumber, message, Steps, theme } from 'antd';

const { useToken } = theme;
import {
  DollarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useRecharge } from '@/hooks/queries/useBalance';

const RechargeContent = () => {
  const { token } = useToken();
  const [amount, setAmount] = useState<number>(100);
  const [currentStep, setCurrentStep] = useState(0);
  const rechargeMutation = useRecharge();

  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

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
    const userId = localStorage.getItem('userId');
    if (!userId) {
      message.error('用户未登录，请重新登录');
      return;
    }

    try {
      await rechargeMutation.mutateAsync({
        userId,
        amount,
        description: '用户充值',
      });
      setCurrentStep(2);
    } catch (error) {
      // 错误已在 useRecharge hook 中处理
    }
  };

  const steps = [
    { title: '选择金额', description: '输入充值金额' },
    { title: '确认充值', description: '确认信息' },
    { title: '完成', description: '充值成功' },
  ];

  return (
    <div>
      <h2>账户充值</h2>

      <Steps current={currentStep} items={steps} style={{ marginBottom: 48 }} />

      {currentStep === 0 && (
        <Card title="选择充值金额">
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>快捷金额：</div>
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
            <div style={{ marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}>自定义金额：</div>
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
        <Card title="确认充值信息">
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                padding: 24,
                background: token.colorBgLayout,
                borderRadius: 8,
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 14, color: token.colorTextSecondary, marginBottom: 8 }}>充值金额</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: token.colorError }}>
                ¥{amount.toFixed(2)}
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: token.colorWarningBg, borderRadius: 8 }}>
              <p style={{ margin: 0, color: token.colorWarningText }}>
                提示：充值金额将直接添加到您的账户余额中，可用于支付平台内的各项服务费用。
              </p>
            </div>
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
              loading={rechargeMutation.isPending}
            >
              确认充值
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 72, color: token.colorSuccess, marginBottom: 24 }} />
            <h2 style={{ fontSize: 28, marginBottom: 16 }}>充值成功！</h2>
            <p style={{ fontSize: 16, color: token.colorTextSecondary, marginBottom: 32 }}>
              ¥{amount.toFixed(2)} 已充值到您的账户
            </p>
            <Button type="primary" size="large" onClick={() => (window.location.href = '/profile')}>
              查看余额
            </Button>
          </div>
        </Card>
      )}

    </div>
  );
};

const Recharge = () => {
  return (
    <ErrorBoundary>
      <RechargeContent />
    </ErrorBoundary>
  );
};

export default Recharge;
