import React, { useMemo } from 'react';
import { Card, Tag, Button, theme } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import type { Plan } from '@/types';

const { useToken } = theme;

interface PlanCardProps {
  plan: Plan;
  loading?: boolean;
  onPurchase: (plan: Plan) => void;
}

/**
 * 套餐卡片组件
 * 展示单个套餐的详细信息和购买按钮
 */
export const PlanCard: React.FC<PlanCardProps> = React.memo(({
  plan,
  loading = false,
  onPurchase,
}) => {
  const { token } = useToken();

  // 套餐类型文本映射
  const planTypeText = useMemo(() => {
    const typeMap: Record<string, string> = {
      monthly: '月付',
      yearly: '年付',
      'one-time': '一次性',
    };
    return typeMap[plan.type] || plan.type;
  }, [plan.type]);

  // 套餐类型颜色映射
  const planTypeColor = useMemo(() => {
    const colorMap: Record<string, string> = {
      monthly: 'blue',
      yearly: 'green',
      'one-time': 'orange',
    };
    return colorMap[plan.type] || 'default';
  }, [plan.type]);

  return (
    <Card
      hoverable
      loading={loading}
      style={{
        height: '100%',
        border: '2px solid #f0f0f0',
        transition: 'all 0.3s',
      }}
      styles={{
        body: {
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        },
      }}
    >
      {/* 套餐头部 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Tag color={planTypeColor} style={{ marginBottom: 12 }}>
          {planTypeText}
        </Tag>
        <h3 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          {plan.name}
        </h3>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 'bold', color: token.colorPrimary }}>
            ¥{plan.price}
          </span>
          {plan.type !== 'one-time' && (
            <span style={{ fontSize: 14, color: token.colorTextSecondary }}>/{plan.duration}天</span>
          )}
        </div>
      </div>

      {/* 套餐详情 */}
      <div style={{ flex: 1, marginBottom: 24 }}>
        {plan.description && (
          <p style={{ color: token.colorTextSecondary, textAlign: 'center', marginBottom: 16 }}>
            {plan.description}
          </p>
        )}

        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            <CheckOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />
            <span>最多 {plan.deviceLimit} 个云手机</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 12,
              fontSize: 14,
            }}
          >
            <CheckOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />
            <span>有效期 {plan.duration} 天</span>
          </div>
          {plan.features && plan.features.length > 0 && (
            <>
              {plan.features.map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 12,
                    fontSize: 14,
                  }}
                >
                  <CheckOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />
                  <span>{feature}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 购买按钮 */}
      <Button
        type="primary"
        size="large"
        block
        onClick={() => onPurchase(plan)}
      >
        立即购买
      </Button>
    </Card>
  );
});

PlanCard.displayName = 'PlanCard';
