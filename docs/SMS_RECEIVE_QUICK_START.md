# SMS验证码接收服务 - 快速开始指南

> **立即开始测试验证码接收平台**

---

## 第一步: 注册平台账号（今天完成）

### 1.1 注册SMS-Activate（推荐首选）

**官网**: https://sms-activate.io

**注册步骤**:
```bash
1. 访问 https://sms-activate.io/?ref=10000000
2. 点击右上角 "Sign up"
3. 输入邮箱和密码（建议使用企业邮箱）
4. 验证邮箱
5. 登录后台
```

**获取API Key**:
```bash
1. 登录后点击右上角头像
2. 点击 "Profile" -> "API"
3. 复制 API Key（格式: Ac1234567890abcdef1234567890abcd）
4. 妥善保存此Key
```

**充值**:
```bash
最低充值: $1 USD
推荐测试充值: $10 USD

支持方式:
- 加密货币（BTC, ETH, USDT）推荐
- 信用卡/借记卡
- PayPal
- WebMoney
- Perfect Money

步骤:
1. 点击 "Balance" -> "Top Up"
2. 选择充值方式
3. 输入金额 $10
4. 完成支付
```

**成本预估（测试用）**:
```
充值 $10 可以获取:
- Telegram号码: 约100个（$0.10/个）
- WhatsApp号码: 约80个（$0.12/个）
- Gmail号码: 约120个（$0.08/个）
- Facebook号码: 约65个（$0.15/个）
```

---

### 1.2 注册5sim（备用平台）

**官网**: https://5sim.net

**注册步骤**:
```bash
1. 访问 https://5sim.net
2. 点击 "Sign Up"
3. 输入邮箱和密码
4. 验证邮箱
```

**获取API Token**:
```bash
1. 登录后点击右上角头像
2. 点击 "Profile" -> "API"
3. 复制 Bearer Token（32位字符串）
4. 保存Token
```

**充值**:
```bash
最低充值: $1 USD
推荐测试充值: $10 USD

支持方式与SMS-Activate类似
```

---

## 第二步: API测试（立即验证）

### 2.1 SMS-Activate API测试

**使用curl测试（Linux/Mac）**:

```bash
# 设置API Key
export API_KEY="YOUR_API_KEY_HERE"

# 1. 检查余额
curl "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=getBalance"
# 响应: ACCESS_BALANCE:10.50

# 2. 获取Telegram俄罗斯号码
curl "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=getNumber&service=tg&country=0"
# 响应: ACCESS_NUMBER:123456789:79123456789
#        ↑           ↑          ↑
#        状态    激活ID      电话号码

# 保存激活ID
export ACTIVATION_ID="123456789"

# 3. 检查短信状态（每5秒检查一次）
curl "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=getStatus&id=$ACTIVATION_ID"
# 响应可能是:
# STATUS_WAIT_CODE - 等待短信
# STATUS_OK:123456 - 收到验证码123456

# 4. 如果收到验证码，标记完成
curl "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=setStatus&status=6&id=$ACTIVATION_ID"

# 5. 如果不需要了，取消（退款）
curl "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=setStatus&status=8&id=$ACTIVATION_ID"
```

**完整测试脚本**:

```bash
#!/bin/bash
# test-sms-activate.sh

API_KEY="YOUR_API_KEY"

echo "=== SMS-Activate 测试 ==="

# 1. 获取号码
echo "1. 获取Telegram号码..."
RESPONSE=$(curl -s "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=getNumber&service=tg&country=0")
echo "响应: $RESPONSE"

# 解析响应
if [[ $RESPONSE == ACCESS_NUMBER* ]]; then
  ACTIVATION_ID=$(echo $RESPONSE | cut -d':' -f2)
  PHONE=$(echo $RESPONSE | cut -d':' -f3)
  echo "✅ 成功获取号码: +$PHONE"
  echo "激活ID: $ACTIVATION_ID"

  # 2. 等待短信（最多60秒）
  echo ""
  echo "2. 等待短信验证码（最多60秒）..."

  for i in {1..12}; do
    sleep 5
    echo "检查 $i/12..."

    STATUS=$(curl -s "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=getStatus&id=$ACTIVATION_ID")

    if [[ $STATUS == STATUS_OK* ]]; then
      CODE=$(echo $STATUS | cut -d':' -f2)
      echo "✅ 收到验证码: $CODE"

      # 标记完成
      curl -s "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=setStatus&status=6&id=$ACTIVATION_ID"
      echo "✅ 激活已完成"
      exit 0
    fi
  done

  echo "❌ 超时未收到短信，取消号码..."
  curl -s "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=setStatus&status=8&id=$ACTIVATION_ID"

else
  echo "❌ 获取号码失败: $RESPONSE"
  echo ""
  echo "常见错误:"
  echo "  NO_BALANCE - 余额不足"
  echo "  NO_NUMBERS - 该服务当前无可用号码"
  echo "  BAD_KEY - API Key错误"
fi
```

**运行测试**:
```bash
chmod +x test-sms-activate.sh
./test-sms-activate.sh
```

---

### 2.2 5sim API测试

```bash
# 设置API Token
export API_TOKEN="YOUR_API_TOKEN_HERE"

# 1. 检查余额和账户信息
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://5sim.net/v1/user/profile"
# 响应: {"id": 123, "email": "...", "balance": 10.50, ...}

# 2. 查看可用服务和价格
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://5sim.net/v1/guest/products/russia/any"
# 返回俄罗斯各种服务的价格

# 3. 购买Telegram号码（俄罗斯）
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://5sim.net/v1/user/buy/activation/russia/any/telegram"
# 响应: {
#   "id": 123456789,
#   "phone": "79123456789",
#   "operator": "mts",
#   "product": "telegram",
#   "price": 0.12,
#   "status": "PENDING",
#   "created_at": "2025-11-02T10:00:00Z"
# }

# 保存ID
export ORDER_ID="123456789"

# 4. 检查短信
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://5sim.net/v1/user/check/$ORDER_ID"
# 响应: {
#   "id": 123456789,
#   "status": "RECEIVED",
#   "sms": [{
#     "code": "123456",
#     "text": "Your code: 123456",
#     "date": "2025-11-02T10:01:30Z"
#   }]
# }

# 5. 完成订单
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://5sim.net/v1/user/finish/$ORDER_ID"

# 6. 取消订单（如果未收到短信）
curl -H "Authorization: Bearer $API_TOKEN" \
  "https://5sim.net/v1/user/cancel/$ORDER_ID"
```

**完整测试脚本**:

```bash
#!/bin/bash
# test-5sim.sh

API_TOKEN="YOUR_API_TOKEN"

echo "=== 5sim 测试 ==="

# 1. 购买号码
echo "1. 购买Telegram号码..."
RESPONSE=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
  "https://5sim.net/v1/user/buy/activation/russia/any/telegram")

ORDER_ID=$(echo $RESPONSE | jq -r '.id')
PHONE=$(echo $RESPONSE | jq -r '.phone')

if [ "$ORDER_ID" != "null" ]; then
  echo "✅ 成功获取号码: +$PHONE"
  echo "订单ID: $ORDER_ID"

  # 2. 等待短信
  echo ""
  echo "2. 等待短信验证码（最多60秒）..."

  for i in {1..12}; do
    sleep 5
    echo "检查 $i/12..."

    STATUS=$(curl -s -H "Authorization: Bearer $API_TOKEN" \
      "https://5sim.net/v1/user/check/$ORDER_ID")

    SMS_STATUS=$(echo $STATUS | jq -r '.status')

    if [ "$SMS_STATUS" = "RECEIVED" ]; then
      CODE=$(echo $STATUS | jq -r '.sms[0].code')
      echo "✅ 收到验证码: $CODE"

      # 完成订单
      curl -s -H "Authorization: Bearer $API_TOKEN" \
        "https://5sim.net/v1/user/finish/$ORDER_ID"
      echo "✅ 订单已完成"
      exit 0
    fi
  done

  echo "❌ 超时未收到短信，取消订单..."
  curl -s -H "Authorization: Bearer $API_TOKEN" \
    "https://5sim.net/v1/user/cancel/$ORDER_ID"

else
  echo "❌ 购买号码失败"
  echo $RESPONSE | jq '.'
fi
```

---

## 第三步: 服务代码对照表

### 3.1 SMS-Activate服务代码

| 应用 | 代码 | 示例价格（俄罗斯） |
|------|------|------------------|
| Google | `go` | $0.08 |
| Telegram | `tg` | $0.10 |
| WhatsApp | `wa` | $0.12 |
| Facebook | `fb` | $0.15 |
| Instagram | `ig` | $0.15 |
| Twitter | `tw` | $0.20 |
| WeChat | `wx` | $0.50 |
| TikTok | `tk` | $0.18 |
| Discord | `ds` | $0.15 |
| Uber | `ub` | $0.30 |

**完整列表**: https://sms-activate.io/en/api2#getServices

### 3.2 5sim服务代码

| 应用 | 代码 | 示例价格（俄罗斯） |
|------|------|------------------|
| Google | `google` | $0.10 |
| Telegram | `telegram` | $0.12 |
| WhatsApp | `whatsapp` | $0.14 |
| Facebook | `facebook` | $0.16 |
| Instagram | `instagram` | $0.16 |
| Twitter | `twitter` | $0.22 |
| WeChat | `wechat` | $0.55 |
| TikTok | `tiktok` | $0.20 |

### 3.3 国家代码对照

**SMS-Activate国家代码**:
```
0 - 俄罗斯（最便宜）
1 - 乌克兰
2 - 哈萨克斯坦
3 - 中国
6 - 印度
12 - 美国
16 - 英国
```

**完整列表**: https://sms-activate.io/en/api2#getCountries

**5sim国家代码**:
```
russia - 俄罗斯
ukraine - 乌克兰
china - 中国
india - 印度
usa - 美国
britain - 英国
```

---

## 第四步: 真实场景测试

### 测试1: Telegram注册流程

```bash
1. 运行测试脚本获取虚拟号码
2. 打开Telegram（云手机或本地）
3. 点击"开始通讯"
4. 选择国家，输入获取的虚拟号码
5. 点击"下一步"
6. 等待验证码（通常10-30秒内到达）
7. 脚本会自动显示验证码
8. 在Telegram中输入验证码
9. 完成注册
```

### 测试2: WhatsApp注册流程

```bash
# 获取WhatsApp号码（美国号码更稳定）
curl "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=getNumber&service=wa&country=12"

# 美国号码通常 $0.50 - $1.00
# 但成功率更高，适合重要应用
```

### 测试3: 批量测试（测试并发性能）

```bash
#!/bin/bash
# batch-test.sh

API_KEY="YOUR_API_KEY"

echo "=== 批量获取10个Telegram号码 ==="

for i in {1..10}; do
  echo "获取号码 $i/10..."

  RESPONSE=$(curl -s "https://api.sms-activate.io/stubs/handler_api.php?api_key=$API_KEY&action=getNumber&service=tg&country=0")

  if [[ $RESPONSE == ACCESS_NUMBER* ]]; then
    PHONE=$(echo $RESPONSE | cut -d':' -f3)
    echo "✅ $i: +$PHONE"
  else
    echo "❌ $i: 失败 - $RESPONSE"
  fi

  # 避免触发限流
  sleep 1
done
```

---

## 第五步: Node.js SDK测试（可选）

### 安装依赖

```bash
npm install axios
```

### SMS-Activate SDK示例

```javascript
// sms-activate-client.js

const axios = require('axios');

class SmsActivateClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.sms-activate.io/stubs/handler_api.php';
  }

  async request(params) {
    const response = await axios.get(this.baseUrl, {
      params: { api_key: this.apiKey, ...params }
    });
    return response.data;
  }

  async getBalance() {
    const data = await this.request({ action: 'getBalance' });
    return parseFloat(data.split(':')[1]);
  }

  async getNumber(service, country = 0) {
    const data = await this.request({
      action: 'getNumber',
      service,
      country
    });

    if (!data.startsWith('ACCESS_NUMBER')) {
      throw new Error(`Failed to get number: ${data}`);
    }

    const parts = data.split(':');
    return {
      activationId: parts[1],
      phoneNumber: `+${parts[2]}`
    };
  }

  async getStatus(activationId) {
    const data = await this.request({
      action: 'getStatus',
      id: activationId
    });

    if (data === 'STATUS_WAIT_CODE') {
      return { status: 'waiting', code: null };
    }

    if (data.startsWith('STATUS_OK:')) {
      return { status: 'received', code: data.split(':')[1] };
    }

    return { status: 'unknown', code: null };
  }

  async setStatus(activationId, status) {
    await this.request({
      action: 'setStatus',
      status,
      id: activationId
    });
  }

  async finish(activationId) {
    await this.setStatus(activationId, 6);
  }

  async cancel(activationId) {
    await this.setStatus(activationId, 8);
  }
}

// 测试
async function test() {
  const client = new SmsActivateClient('YOUR_API_KEY');

  try {
    // 1. 检查余额
    const balance = await client.getBalance();
    console.log(`余额: $${balance.toFixed(2)}`);

    // 2. 获取号码
    const number = await client.getNumber('tg', 0);
    console.log(`获取号码: ${number.phoneNumber}`);

    // 3. 等待验证码
    console.log('等待验证码...');

    for (let i = 0; i < 12; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const status = await client.getStatus(number.activationId);

      if (status.status === 'received') {
        console.log(`✅ 验证码: ${status.code}`);
        await client.finish(number.activationId);
        return;
      }

      console.log(`检查 ${i + 1}/12...`);
    }

    // 超时取消
    console.log('超时，取消号码');
    await client.cancel(number.activationId);

  } catch (error) {
    console.error('错误:', error.message);
  }
}

test();
```

**运行测试**:
```bash
node sms-activate-client.js
```

---

## 第六步: 常见问题和解决方案

### Q1: NO_NUMBERS错误

**原因**: 该国家/服务当前无可用号码

**解决方案**:
```bash
# 1. 尝试其他国家
curl "...&service=tg&country=1"  # 改为乌克兰

# 2. 等待几分钟后重试

# 3. 切换到5sim平台

# 4. 使用号码租赁（如果支持）
```

### Q2: NO_BALANCE错误

**解决方案**:
```bash
1. 检查余额
curl "...&action=getBalance"

2. 如果余额不足，前往官网充值
```

### Q3: 验证码迟迟不来

**可能原因**:
- 平台短信网关延迟（正常，等待1-2分钟）
- 应用检测到虚拟号码（尝试其他国家）
- 号码已被封禁（取消并重新获取）

**解决方案**:
```bash
# 如果5分钟内未收到，取消号码（会退款）
curl "...&action=setStatus&status=8&id=$ACTIVATION_ID"

# 重新获取新号码
```

### Q4: 如何选择最便宜的国家？

**推荐选择**:
```
1. 俄罗斯（0） - 最便宜，但某些应用可能不支持
2. 印度（6） - 价格低，支持度高
3. 印度尼西亚（6） - 价格适中
4. 越南（10） - 性价比高

避免选择:
- 美国（12） - 最贵，但某些应用必须用（如Google Voice）
- 英国（16） - 较贵
```

### Q5: 如何提高成功率？

**最佳实践**:
```bash
1. 选择成功率高的国家（检查平台统计）

2. 避免高峰时段（平台用户多时号码紧张）
   推荐时间: UTC 00:00-08:00（北京时间 08:00-16:00）

3. 预算充足时选择"物理SIM卡"服务
   - 价格更高（$3-5）
   - 成功率接近100%
   - 适用于Google Voice、PayPal等高风险应用

4. 使用号码租赁（可接收多条短信）
   - 适合需要多次验证的场景
   - 24小时租赁约 $1-2

5. 设置合理的超时时间
   - 建议: 5-10分钟
   - 如果超时，及时取消获得退款
```

---

## 第七步: 成本优化建议

### 7.1 节省成本技巧

**1. 选择低价国家**
```
俄罗斯 Telegram: $0.10
印度 Telegram:   $0.08  ← 更便宜
```

**2. 批量充值享受折扣**
```
SMS-Activate:
- 充值 $100+: 额外赠送 5%
- 充值 $500+: 额外赠送 10%
- 充值 $1000+: 额外赠送 15%
```

**3. 使用号码租赁**
```
场景: 需要接收3条验证码

方式A - 购买3次:
3 × $0.10 = $0.30

方式B - 租赁24小时:
$0.50（无限接收）

如果需要接收5+条，租赁更划算
```

**4. 避免浪费**
```
- 及时取消未使用的号码（获得退款）
- 使用号码池预热（预购买常用号码）
- 设置自动超时取消（我们的系统会实现）
```

### 7.2 预算规划

**小规模测试（100个注册/天）**:
```
服务: Telegram俄罗斯号码
单价: $0.10
日成本: $10
月成本: $300
```

**中等规模（1000个注册/天）**:
```
服务: 混合（Telegram, WhatsApp, Google）
平均单价: $0.12
日成本: $120
月成本: $3,600

优化后（使用低价国家+批量折扣）:
月成本: $2,500 - $3,000
```

**大规模（5000个注册/天）**:
```
建议:
1. 联系SMS-Activate商务部门（可能获得企业折扣）
2. 同时使用SMS-Activate + 5sim分散成本
3. 使用号码池（预购买+缓存）降低获取时间
4. 实施成本监控和优化算法

预估月成本: $12,000 - $15,000
```

---

## 第八步: 下周开发计划

### Day 1-2: 环境准备
```bash
✅ 注册SMS-Activate和5sim账号
✅ 充值测试金额（各$10）
✅ 测试API调用
✅ 验证真实场景（Telegram注册）
```

### Day 3-5: 微服务开发
```bash
□ 创建 backend/sms-receive-service
□ 实现数据库Schema
□ 实现SMS-Activate Adapter
□ 实现5sim Adapter
□ 实现NumberManagementService
□ 实现MessagePollingService
```

### Day 6-7: 系统集成
```bash
□ Device Service集成
□ RabbitMQ事件消费
□ API Gateway路由
□ 基础测试
```

### Week 2: 高级功能
```bash
□ 号码池实现
□ 批量操作API
□ 监控和告警
□ 前端集成
```

---

## 立即行动清单

**今天（30分钟内）**:
- [ ] 注册SMS-Activate账号
- [ ] 注册5sim账号
- [ ] 各充值$10
- [ ] 获取API Key/Token

**今天下午（1小时）**:
- [ ] 运行curl测试脚本
- [ ] 成功获取1个虚拟号码
- [ ] 完成1次真实Telegram注册

**本周**:
- [ ] 测试5-10个不同服务
- [ ] 评估成本和成功率
- [ ] 确认技术方案
- [ ] 开始开发sms-receive-service

---

## 联系支持

**SMS-Activate**:
- Telegram: @smsactivate_en
- Email: support@sms-activate.io
- 在线聊天: https://sms-activate.io

**5sim**:
- Telegram: @fivesim_support
- Email: support@5sim.net

**问题反馈**:
如有任何问题，请在项目中创建Issue或联系技术团队。

---

**祝测试顺利！🚀**
