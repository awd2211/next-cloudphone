# Grafana 业务指标仪表板说明

**文件位置**: `infrastructure/monitoring/grafana/dashboards/business-metrics.json`
**仪表板名称**: Cloud Phone - Business Metrics
**刷新间隔**: 30 秒
**默认时间范围**: 最近 6 小时

---

## 📊 仪表板概述

业务指标仪表板包含 **22 个可视化面板**，分为 **5 个主要部分**，全面展示云手机平台的关键业务指标和 KPI。

---

## 🎯 面板布局

### 第一部分：核心业务指标 (KPIs) - 6 个面板

顶部一行展示最重要的业务指标，提供快速概览：

| 面板 ID | 标题 | 指标 | 类型 | 说明 |
|---------|------|------|------|------|
| 2 | **总用户数** | `cloudphone_users_total` | Stat | 平台总注册用户数 |
| 3 | **在线用户数** | `cloudphone_users_online` | Stat | 当前在线用户数（最近 5 分钟活跃） |
| 4 | **运行中设备** | `cloudphone_devices_running` | Stat | 当前运行状态的设备数 |
| 5 | **总营收** | `cloudphone_total_revenue` | Stat | 平台总营收（单位：¥） |
| 6 | **余额不足用户** | `cloudphone_users_low_balance` | Stat | 余额不足用户数（需关注） |
| 7 | **活跃设备数** | `cloudphone_devices_active` | Stat | 活跃设备总数 |

**阈值配置**:
- 总用户数: 0 (蓝色) → 100 (绿色) → 1000 (黄色)
- 在线用户数: 0 (红色) → 10 (黄色) → 50 (绿色)
- 余额不足: 0 (绿色) → 10 (黄色) → 50 (红色)

---

### 第二部分：支付与计费 - 5 个面板

#### 面板 11: 支付成功率 (Time Series)
- **查询**: `rate(cloudphone_payments_success_total[5m]) / rate(cloudphone_payment_attempts_total[5m]) * 100`
- **单位**: 百分比 (0-100%)
- **作用**: 实时监控支付系统健康度

#### 面板 12: 支付操作趋势 (Time Series)
- **查询**:
  - 支付尝试/秒: `rate(cloudphone_payment_attempts_total[5m])`
  - 支付成功/秒: `rate(cloudphone_payments_success_total[5m])`
  - 支付失败/秒: `rate(cloudphone_payment_failures_total[5m])`
- **作用**: 对比支付尝试、成功、失败的趋势

#### 面板 13: 支付耗时分布 (Time Series)
- **查询**:
  - P50: `histogram_quantile(0.50, rate(cloudphone_payment_duration_seconds_bucket[5m]))`
  - P95: `histogram_quantile(0.95, rate(cloudphone_payment_duration_seconds_bucket[5m]))`
  - P99: `histogram_quantile(0.99, rate(cloudphone_payment_duration_seconds_bucket[5m]))`
- **单位**: 秒
- **作用**: 监控支付性能，发现慢支付问题

#### 面板 14: 支付失败原因分布 (Pie Chart)
- **查询**: `sum by (reason) (increase(cloudphone_payment_failures_total[1h]))`
- **类型**: Donut 饼图
- **作用**: 分析支付失败的主要原因

#### 面板 15: 退款趋势 (Time Series)
- **查询**: `rate(cloudphone_refunds_total[5m])`
- **作用**: 监控退款频率，发现异常退款

---

### 第三部分：用户注册与登录 - 5 个面板

#### 面板 21: 用户注册趋势 (Time Series)
- **查询**:
  - 注册尝试/秒
  - 注册成功/秒
  - 注册失败/秒
- **作用**: 监控用户增长和注册系统健康度

#### 面板 22: 用户登录趋势 (Time Series)
- **查询**:
  - 登录尝试/秒
  - 登录成功/秒
  - 登录失败/秒
- **作用**: 监控用户活跃度和认证系统状态

#### 面板 23: 登录成功率 (Stat)
- **查询**: `rate(cloudphone_user_login_success_total[5m]) / rate(cloudphone_user_login_attempts_total[5m]) * 100`
- **单位**: 百分比
- **阈值**:
  - 0-80%: 红色 (严重问题)
  - 80-95%: 黄色 (需关注)
  - 95-100%: 绿色 (正常)
- **作用**: 快速识别认证问题

#### 面板 24: 登录失败原因分布 (Pie Chart)
- **查询**: `sum by (reason) (increase(cloudphone_user_login_failures_total[1h]))`
- **作用**: 分析登录失败的主要原因（用户名错误、密码错误等）

#### 面板 25: 用户锁定事件 (Time Series)
- **查询**: `rate(cloudphone_users_locked_total[5m])`
- **作用**: 监控账号锁定频率，发现暴力破解攻击

---

### 第四部分：设备管理 - 5 个面板

#### 面板 31: 设备创建趋势 (Time Series)
- **查询**:
  - 创建尝试/秒
  - 创建失败/秒
- **作用**: 监控设备供应能力和成功率

#### 面板 32: 设备创建成功率 (Stat)
- **查询**: `(rate(cloudphone_device_creation_attempts_total[5m]) - rate(cloudphone_device_creation_failures_total[5m])) / rate(cloudphone_device_creation_attempts_total[5m]) * 100`
- **单位**: 百分比
- **阈值**:
  - 0-90%: 红色
  - 90-98%: 黄色
  - 98-100%: 绿色
- **作用**: 快速评估设备供应质量

#### 面板 33: 设备状态分布 (Time Series)
- **查询**:
  - 运行中: `cloudphone_devices_running`
  - 已停止: `cloudphone_devices_stopped`
  - 错误: `cloudphone_devices_error`
- **作用**: 实时监控设备池健康状态

#### 面板 34: 设备创建失败原因 (Pie Chart)
- **查询**: `sum by (reason) (increase(cloudphone_device_creation_failures_total[1h]))`
- **作用**: 分析设备创建失败的根本原因

#### 面板 35: 设备启动失败率 (Time Series)
- **查询**: `rate(cloudphone_device_start_failures_total[5m]) / rate(cloudphone_device_start_attempts_total[5m]) * 100`
- **单位**: 百分比
- **作用**: 监控设备启动可靠性

---

### 第五部分：业务 KPI 总览 - 1 个面板

#### 面板 41: 关键业务指标汇总 (Table)

**显示的指标** (最近 1 小时):

| 指标名称 | Prometheus 查询 | 说明 |
|----------|-----------------|------|
| **新注册用户** | `sum(increase(cloudphone_user_registration_success_total[1h]))` | 最近 1 小时新注册用户数 |
| **成功登录次数** | `sum(increase(cloudphone_user_login_success_total[1h]))` | 最近 1 小时登录成功次数 |
| **成功支付次数** | `sum(increase(cloudphone_payments_success_total[1h]))` | 最近 1 小时支付成功次数 |
| **设备创建尝试** | `sum(increase(cloudphone_device_creation_attempts_total[1h]))` | 最近 1 小时设备创建尝试次数 |
| **总营收 (¥)** | `cloudphone_total_revenue` | 当前总营收 |

**作用**: 提供一个快速的业务 KPI 概览表格，方便截图和报告。

---

## 🎨 可视化类型说明

### Stat (统计面板)
- 显示单个指标的当前值
- 支持阈值颜色变化
- 带有迷你趋势图

### Time Series (时间序列图)
- 显示指标随时间变化的趋势
- 支持多条曲线对比
- 适合监控实时变化

### Pie Chart (饼图)
- 显示分类数据的占比
- Donut 样式更美观
- 适合分析失败原因等分类数据

### Table (表格)
- 显示多个指标的汇总数据
- 支持格式化和重命名
- 适合 KPI 报告

---

## 📈 使用场景

### 1. 日常运维监控
- **关注面板**: KPI 区域 (面板 2-7)
- **频率**: 每小时检查一次
- **关注点**:
  - 在线用户数是否正常
  - 余额不足用户是否增多
  - 设备池是否健康

### 2. 支付系统监控
- **关注面板**: 支付与计费区域 (面板 11-15)
- **频率**: 每 30 分钟检查一次
- **关注点**:
  - 支付成功率是否 > 95%
  - 支付耗时 P99 是否 < 5s
  - 是否有异常退款

### 3. 用户增长分析
- **关注面板**: 用户注册与登录区域 (面板 21-25)
- **频率**: 每天检查一次
- **关注点**:
  - 注册成功率趋势
  - 登录成功率是否稳定
  - 是否有暴力破解攻击（用户锁定激增）

### 4. 设备供应质量监控
- **关注面板**: 设备管理区域 (面板 31-35)
- **频率**: 每小时检查一次
- **关注点**:
  - 设备创建成功率是否 > 98%
  - 错误设备数是否增多
  - 设备启动失败率是否正常

### 5. 业务报告
- **关注面板**: 业务 KPI 总览 (面板 41)
- **频率**: 每天或每周生成报告
- **操作**: 截图表格用于周报/月报

---

## ⚠️ 告警建议

基于此仪表板，建议配置以下告警规则（已在 `alert.rules.yml` 中定义）:

| 告警名称 | 指标 | 阈值 | 说明 |
|----------|------|------|------|
| **HighPaymentFailureRate** | 支付失败率 | > 5% (5 分钟) | 支付系统异常 |
| **HighLoginFailureRate** | 登录失败率 | > 10% (5 分钟) | 认证系统问题或攻击 |
| **HighRegistrationFailureRate** | 注册失败率 | > 10% (5 分钟) | 注册系统异常 |
| **HighDeviceCreationFailureRate** | 设备创建失败率 | > 10% (5 分钟) | 设备供应问题 |
| **LowPaymentSuccessRate** | 支付成功率 | < 90% (10 分钟) | 严重支付问题 |

---

## 🔧 导入仪表板

### 通过 Grafana UI 导入

1. 登录 Grafana: http://localhost:3000
2. 点击左侧菜单 "+" → "Import"
3. 上传文件或粘贴 JSON:
   ```bash
   cat infrastructure/monitoring/grafana/dashboards/business-metrics.json
   ```
4. 选择 Prometheus 数据源
5. 点击 "Import"

### 通过配置文件自动加载

如果使用 Grafana 的 provisioning 功能，仪表板会自动加载：

```yaml
# infrastructure/monitoring/grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1

providers:
  - name: 'Cloud Phone Dashboards'
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    options:
      path: /etc/grafana/provisioning/dashboards
```

---

## 📊 指标数据源

所有指标来自 **Prometheus**，由以下服务提供：

| 服务 | 指标前缀 | 端口 |
|------|----------|------|
| **billing-service** | `cloudphone_payment_*`, `cloudphone_refunds_*`, `cloudphone_bills_*`, `cloudphone_total_revenue`, `cloudphone_users_low_balance` | 30005 |
| **user-service** | `cloudphone_user_*`, `cloudphone_users_*` | 30001 |
| **device-service** | `cloudphone_device_*`, `cloudphone_devices_*` | 30002 |

**Prometheus 抓取配置**:
```yaml
scrape_configs:
  - job_name: 'nestjs-services'
    scrape_interval: 15s
    static_configs:
      - targets:
          - 'host.docker.internal:30001'  # user-service
          - 'host.docker.internal:30002'  # device-service
          - 'host.docker.internal:30005'  # billing-service
        labels:
          app: 'nestjs'
```

---

## 🚀 性能优化建议

### 1. 查询优化
- 使用 `rate()` 而非 `increase()` 计算速率
- 合理设置时间窗口（5m, 1h）
- 避免过于频繁的刷新间隔

### 2. 面板优化
- 使用 Stat 面板代替 Time Series 显示单值
- 饼图数据量不要过大（< 10 个分类）
- 表格面板限制行数（< 20 行）

### 3. 数据保留
- Prometheus 默认保留 15 天
- 长期趋势分析考虑使用 Thanos 或 Cortex
- 定期导出重要指标数据

---

## 📚 相关文档

- [业务指标集成完成报告](./BUSINESS_METRICS_INTEGRATION_COMPLETE.md)
- [业务指标使用指南](./BUSINESS_METRICS_USAGE_GUIDE.md)
- [告警规则配置](./ALERTS_AND_METRICS_COMPLETE.md)
- [Prometheus 配置](../infrastructure/monitoring/prometheus/prometheus.yml)
- [Grafana 官方文档](https://grafana.com/docs/)

---

## 📝 维护说明

### 更新仪表板

1. 在 Grafana UI 中修改面板
2. 点击右上角 "Share" → "Export" → "Save to file"
3. 将导出的 JSON 替换 `business-metrics.json`
4. 提交到版本控制

### 添加新面板

1. 确认新的业务指标已在服务中集成
2. 在 Grafana UI 中添加新面板
3. 编写 PromQL 查询
4. 配置可视化样式
5. 导出并更新 JSON 文件

### 版本管理

- 当前版本: **v2.0**
- 版本历史:
  - v1.0: 基础仪表板（6 个面板）
  - v2.0: 完整业务指标仪表板（22 个面板）

---

## ✅ 总结

业务指标仪表板提供了：
- ✅ **6 个核心 KPI** 快速概览
- ✅ **5 个支付指标面板** 监控支付健康度
- ✅ **5 个用户指标面板** 跟踪用户增长和活跃度
- ✅ **5 个设备指标面板** 监控设备供应质量
- ✅ **1 个 KPI 汇总表格** 方便生成报告

这是一个**生产级别**的业务监控仪表板，为运维、产品和业务团队提供全面的业务洞察。
