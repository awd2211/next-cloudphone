# 支付管理后台 API 文档

## 📋 概述

本文档介绍支付管理后台的所有 API 接口，供管理员使用。

**Base URL**: `/api/admin/payments`

**权限要求**: 所有接口需要管理员权限

---

## 📊 统计与报表

### 1. 获取支付统计数据

**GET** `/admin/payments/statistics`

获取支付总体统计数据，包括交易量、成功率、收入等。

**Query Parameters:**
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 结束日期 (YYYY-MM-DD) |

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTransactions": 1523,
      "successfulTransactions": 1450,
      "failedTransactions": 58,
      "refundedTransactions": 15,
      "successRate": "95.21"
    },
    "revenue": {
      "totalRevenue": "125450.00",
      "totalRefunded": "3250.00",
      "netRevenue": "122200.00"
    },
    "period": {
      "startDate": "2025-01-01",
      "endDate": "2025-01-31"
    }
  }
}
```

### 2. 获取支付方式占比

**GET** `/admin/payments/statistics/payment-methods`

获取各支付方式的使用统计。

**Query Parameters:**
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "method": "stripe",
      "count": 450,
      "percentage": "31.03",
      "totalAmount": "45230.00",
      "amountPercentage": "36.05"
    },
    {
      "method": "paypal",
      "count": 320,
      "percentage": "22.07",
      "totalAmount": "32150.00",
      "amountPercentage": "25.63"
    }
  ]
}
```

### 3. 获取每日统计

**GET** `/admin/payments/statistics/daily`

获取每日交易统计趋势。

**Query Parameters:**
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| days | number | 否 | 统计天数，默认30天 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-23",
      "totalTransactions": 52,
      "successfulTransactions": 49,
      "revenue": "5230.00"
    },
    {
      "date": "2025-01-24",
      "totalTransactions": 63,
      "successfulTransactions": 60,
      "revenue": "6480.00"
    }
  ]
}
```

---

## 💰 支付记录管理

### 4. 获取所有支付记录

**GET** `/admin/payments`

获取所有支付记录，支持分页、筛选和搜索。

**Query Parameters:**
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20 |
| status | string | 否 | 状态筛选: `success`, `failed`, `pending` 等 |
| method | string | 否 | 支付方式: `stripe`, `paypal`, `paddle` 等 |
| userId | string | 否 | 用户ID筛选 |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |
| search | string | 否 | 搜索支付单号或订单号 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payment-uuid",
      "paymentNo": "PAY1706012345",
      "orderId": "order-uuid",
      "userId": "user-uuid",
      "amount": 99.99,
      "currency": "USD",
      "method": "stripe",
      "status": "success",
      "paidAt": "2025-01-23T10:30:00Z",
      "createdAt": "2025-01-23T10:25:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1523,
    "totalPages": 77
  }
}
```

### 5. 获取支付详情

**GET** `/admin/payments/:id`

获取单个支付的详细信息，包括关联订单。

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "paymentNo": "PAY1706012345",
    "amount": 99.99,
    "currency": "USD",
    "method": "stripe",
    "status": "success",
    "transactionId": "pi_xxx",
    "customerId": "cus_xxx",
    "metadata": {},
    "order": {
      "id": "order-uuid",
      "type": "subscription",
      "status": "paid"
    },
    "paidAt": "2025-01-23T10:30:00Z",
    "createdAt": "2025-01-23T10:25:00Z"
  }
}
```

---

## 🔄 退款管理

### 6. 手动发起退款

**POST** `/admin/payments/:id/refund`

管理员手动为支付发起退款。

**Request Body:**
```json
{
  "amount": 50.00,  // 可选，不填则全额退款
  "reason": "客户申请退款",
  "adminNote": "审核通过，同意退款"  // 可选，管理员备注
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "status": "refunded",
    "refundAmount": 50.00,
    "refundReason": "客户申请退款",
    "refundedAt": "2025-01-23T11:00:00Z"
  },
  "message": "退款处理成功"
}
```

### 7. 获取待审核退款列表

**GET** `/admin/payments/refunds/pending`

获取所有待审核的退款申请。

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payment-uuid",
      "paymentNo": "PAY1706012345",
      "amount": 99.99,
      "status": "refunding",
      "userId": "user-uuid",
      "createdAt": "2025-01-23T09:00:00Z"
    }
  ]
}
```

### 8. 批准退款申请

**POST** `/admin/payments/refunds/:id/approve`

批准用户的退款申请。

**Request Body:**
```json
{
  "adminNote": "退款理由合理，批准"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "status": "refunded"
  },
  "message": "退款已批准"
}
```

### 9. 拒绝退款申请

**POST** `/admin/payments/refunds/:id/reject`

拒绝用户的退款申请。

**Request Body:**
```json
{
  "reason": "不符合退款政策",
  "adminNote": "超过退款期限"
}
```

**Response:**
```json
{
  "success": true,
  "message": "退款已拒绝"
}
```

---

## 🚨 异常处理

### 10. 获取异常支付列表

**GET** `/admin/payments/exceptions/list`

获取所有异常支付（失败、退款中等）。

**Query Parameters:**
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| limit | number | 否 | 每页数量 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payment-uuid",
      "status": "failed",
      "failureReason": "卡片被拒绝",
      "method": "stripe",
      "amount": 99.99,
      "createdAt": "2025-01-23T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 58,
    "totalPages": 3
  }
}
```

### 11. 手动同步支付状态

**POST** `/admin/payments/:id/sync`

手动同步支付平台的最新状态。

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "status": "success",
    "metadata": {
      "lastSync": "2025-01-23T12:00:00Z",
      "syncResult": {
        "transactionId": "pi_xxx",
        "status": "success"
      }
    }
  },
  "message": "同步成功"
}
```

---

## 📥 数据导出

### 12. 导出支付数据为 Excel

**GET** `/admin/payments/export/excel`

导出支付数据为 Excel 文件。

**Query Parameters:**
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |
| status | string | 否 | 状态筛选 |
| method | string | 否 | 支付方式筛选 |

**Response:**
```json
{
  "success": true,
  "data": {
    "buffer": "base64编码的Excel文件",
    "filename": "payments_2025-01-23.xlsx"
  },
  "message": "导出成功"
}
```

**前端处理示例:**
```typescript
// 下载 Excel 文件
const response = await fetch('/api/admin/payments/export/excel?startDate=2025-01-01');
const data = await response.json();

const buffer = Uint8Array.from(atob(data.data.buffer), c => c.charCodeAt(0));
const blob = new Blob([buffer], {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
});

const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = data.data.filename;
a.click();
```

---

## ⚙️ 配置管理

### 13. 获取支付配置

**GET** `/admin/payments/config/all`

获取所有支付配置信息。

**Response:**
```json
{
  "success": true,
  "data": {
    "enabledMethods": ["stripe", "paypal", "paddle", "wechat", "alipay"],
    "enabledCurrencies": ["USD", "EUR", "GBP", "CNY", "JPY"],
    "providers": {
      "stripe": {
        "enabled": true,
        "mode": "test",
        "connected": {
          "success": true,
          "message": "连接正常"
        }
      },
      "paypal": {
        "enabled": true,
        "mode": "sandbox",
        "connected": {
          "success": true,
          "message": "连接正常"
        }
      }
    }
  }
}
```

### 14. 更新支付配置

**PUT** `/admin/payments/config`

更新支付配置。

**Request Body:**
```json
{
  "enabledMethods": ["stripe", "paypal"],
  "enabledCurrencies": ["USD", "EUR"],
  "settings": {
    "minAmount": 1.00,
    "maxAmount": 10000.00
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabledMethods": ["stripe", "paypal"],
    "enabledCurrencies": ["USD", "EUR"]
  },
  "message": "配置更新成功"
}
```

### 15. 测试支付提供商连接

**POST** `/admin/payments/config/test/:provider`

测试指定支付提供商的连接状态。

**Path Parameters:**
| 参数 | 类型 | 说明 |
|------|------|------|
| provider | string | 支付提供商: `stripe`, `paypal`, `paddle` |

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "连接正常"
  },
  "message": "连接测试成功"
}
```

---

## 📝 日志与审计

### 16. 获取 Webhook 日志

**GET** `/admin/payments/webhooks/logs`

获取支付平台的 Webhook 回调日志。

**Query Parameters:**
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码 |
| limit | number | 否 | 每页数量 |
| provider | string | 否 | 支付提供商筛选 |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "provider": "stripe",
      "eventType": "payment_intent.succeeded",
      "payload": {},
      "processed": true,
      "createdAt": "2025-01-23T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "totalPages": 5
  }
}
```

---

## 🎨 前端集成示例

### React + Ant Design 示例

```tsx
import React, { useState, useEffect } from 'react';
import { Table, Card, Statistic, Row, Col, DatePicker, Select, Button } from 'antd';
import { DollarOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const PaymentAdminDashboard = () => {
  const [statistics, setStatistics] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  // 获取统计数据
  useEffect(() => {
    fetch('/api/admin/payments/statistics')
      .then(res => res.json())
      .then(data => setStatistics(data.data));
  }, []);

  // 获取支付列表
  const fetchPayments = async (page = 1, filters = {}) => {
    setLoading(true);
    const query = new URLSearchParams({ page, ...filters }).toString();
    const res = await fetch(`/api/admin/payments?${query}`);
    const data = await res.json();
    setPayments(data.data);
    setLoading(false);
  };

  // 手动退款
  const handleRefund = async (paymentId, amount, reason) => {
    const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason }),
    });
    const data = await res.json();
    if (data.success) {
      message.success('退款成功');
      fetchPayments();
    }
  };

  const columns = [
    { title: '支付单号', dataIndex: 'paymentNo', key: 'paymentNo' },
    { title: '金额', dataIndex: 'amount', key: 'amount' },
    { title: '支付方式', dataIndex: 'method', key: 'method' },
    { title: '状态', dataIndex: 'status', key: 'status' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button onClick={() => handleRefund(record.id, record.amount, '管理员退款')}>
          退款
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* 统计卡片 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总交易量"
              value={statistics?.overview.totalTransactions}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="成功率"
              value={statistics?.overview.successRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 支付列表 */}
      <Card style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={payments}
          loading={loading}
          rowKey="id"
        />
      </Card>
    </div>
  );
};

export default PaymentAdminDashboard;
```

---

## 🔐 权限控制

所有管理后台 API 都需要管理员权限。建议实现：

1. **JWT Token 验证**
2. **角色检查**: 确保用户角色为 `admin`
3. **操作日志**: 记录所有管理员操作

**Guard 示例:**
```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('需要管理员权限');
    }

    return true;
  }
}
```

---

## 📌 注意事项

1. **敏感操作记录**: 退款、配置更新等操作应记录审计日志
2. **权限严格控制**: 确保只有管理员可以访问这些接口
3. **数据导出限制**: 考虑添加导出数量限制，防止性能问题
4. **Webhook 日志**: 需要创建 `webhook_logs` 表来存储日志
5. **退款审核流程**: 可以添加多级审核机制

---

**相关文档**:
- [用户端支付 API](./PAYMENT_USAGE_GUIDE.md)
- [支付集成进度](../../PAYMENT_INTEGRATION_PROGRESS.md)
