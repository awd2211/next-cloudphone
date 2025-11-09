# RBAC 权限补充完成报告

> 生成时间: 2025-11-06
> 状态: ✅ 已完成
> 变更类型: 权限扩展（299 → 514）

## 📊 执行摘要

成功补充了系统中缺失的核心模块权限，将权限总数从 **299** 扩展到 **514**，新增 **215 个权限**，覆盖 20 个核心业务模块。

### 关键指标

| 指标 | 数值 | 变化 |
|------|------|------|
| **权限总数** | 514 | +215 (↑72%) |
| **资源类型** | 44 | +20 |
| **操作类型** | 122+ | +30+ |
| **super_admin 权限覆盖率** | 100% (514/514) | ✅ 完全覆盖 |
| **superadmin 用户权限** | 514 | ✅ 完全访问 |
| **superadmin 用户菜单** | 50 | ✅ 完全访问 |

---

## 🎯 补充的权限模块

### 新增的 20 个核心模块

| # | 模块名称 | 英文资源 | 权限数 | 说明 |
|---|---------|---------|--------|------|
| 1 | **配额管理** | quota | 15 | 用户配额分配、检查、调整、告警 |
| 2 | **支付管理** | payment | 12 | 支付订单、退款、对账、统计 |
| 3 | **发票管理** | invoice | 12 | 发票创建、发送、作废、模板 |
| 4 | **订阅管理** | subscription | 12 | 订阅创建、升级、降级、试用 |
| 5 | **设备模板** | template | 12 | 模板创建、克隆、版本管理 |
| 6 | **租户管理** | tenant | 12 | 多租户管理、隔离、配额 |
| 7 | **工单管理** | ticket | 12 | 工单流转、分配、升级 |
| 8 | **套餐计划** | plan | 10 | 套餐发布、对比、定价 |
| 9 | **队列管理** | queue | 10 | 消息队列管理、监控 |
| 10 | **系统设置** | setting | 10 | 配置导入导出、备份恢复 |
| 11 | **设备快照** | snapshot | 10 | 快照创建、恢复、清理 |
| 12 | **Webhook** | webhook | 10 | Webhook 管理、测试、统计 |
| 13 | **审计日志** | audit-log | 10 | 日志查看、导出、敏感操作 |
| 14 | **余额管理** | balance | 10 | 充值、扣费、冻结、历史 |
| 15 | **缓存管理** | cache | 10 | 缓存读写、清理、预热 |
| 16 | **部门管理** | department | 10 | 部门树、成员管理 |
| 17 | **监控管理** | monitor | 10 | 监控面板、告警、追踪 |
| 18 | **物理设备** | physical-device | 10 | 物理设备管理、监控 |
| 19 | **API 密钥** | api-key | 10 | API Key 创建、撤销、轮换 |
| 20 | **使用量管理** | usage | 8 | 使用量记录、统计、预测 |

**总计**: 215 个权限

---

## 📋 详细权限清单

### 1. 配额管理 (Quota) - 15 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| quota.create | 创建配额规则 | create |
| quota.read | 查看配额信息 | read |
| quota.update | 更新配额规则 | update |
| quota.delete | 删除配额规则 | delete |
| quota.list | 列出所有配额 | list |
| quota.check | 检查配额使用情况 | check |
| quota.adjust | 调整用户配额 | adjust |
| quota.reset | 重置配额计数 | reset |
| quota.usage | 查看配额使用详情 | usage |
| quota.history | 查看配额变更历史 | history |
| quota.report | 生成配额报告 | report |
| quota.export | 导出配额数据 | export |
| quota.template | 管理配额模板 | template |
| quota.alert | 配额告警管理 | alert |
| quota.enforce | 强制配额限制 | enforce |

**应用场景**:
- 为用户分配设备数量、CPU、内存等资源配额
- 实时检查用户配额使用情况，超限时阻止操作
- 配额预警机制（达到 80% 时告警）
- 配额调整审批流程

---

### 2. 工单管理 (Ticket) - 12 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| ticket.create | 创建工单 | create |
| ticket.read | 查看工单详情 | read |
| ticket.update | 更新工单信息 | update |
| ticket.delete | 删除工单 | delete |
| ticket.list | 列出工单 | list |
| ticket.assign | 分配工单 | assign |
| ticket.resolve | 解决工单 | resolve |
| ticket.close | 关闭工单 | close |
| ticket.reopen | 重新打开工单 | reopen |
| ticket.comment | 添加工单评论 | comment |
| ticket.escalate | 升级工单优先级 | escalate |
| ticket.stats | 查看工单统计 | stats |

**应用场景**:
- 用户提交技术支持工单
- 工单自动路由到对应技术人员
- 工单升级机制（超过 24 小时未处理自动升级）
- 工单满意度评价

---

### 3. 审计日志 (Audit Log) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| audit-log.read | 查看审计日志 | read |
| audit-log.list | 列出审计日志 | list |
| audit-log.search | 搜索审计日志 | search |
| audit-log.filter | 过滤审计日志 | filter |
| audit-log.export | 导出审计日志 | export |
| audit-log.stats | 审计统计分析 | stats |
| audit-log.archive | 归档审计日志 | archive |
| audit-log.cleanup | 清理旧日志 | cleanup |
| audit-log.sensitive-read | 查看敏感操作日志 | sensitive-read |
| audit-log.user-activity | 查看用户活动日志 | user-activity |

**应用场景**:
- 记录所有用户操作（登录、创建设备、修改配置等）
- 安全审计和合规性检查
- 异常行为分析（短时间内大量删除操作）
- 操作回溯（谁在什么时间做了什么）

---

### 4. API 密钥管理 (API Key) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| api-key.create | 创建 API 密钥 | create |
| api-key.read | 查看 API 密钥 | read |
| api-key.update | 更新 API 密钥 | update |
| api-key.delete | 删除 API 密钥 | delete |
| api-key.list | 列出 API 密钥 | list |
| api-key.revoke | 撤销 API 密钥 | revoke |
| api-key.renew | 续期 API 密钥 | renew |
| api-key.rotate | 轮换 API 密钥 | rotate |
| api-key.usage | 查看 API 使用情况 | usage |
| api-key.rate-limit | 设置 API 速率限制 | rate-limit |

**应用场景**:
- 为第三方应用分配 API Key
- API Key 自动过期和续期
- API Key 泄露时快速撤销
- 监控 API 调用频率和用量

---

### 5. 设备模板 (Template) - 12 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| template.create | 创建设备模板 | create |
| template.read | 查看设备模板 | read |
| template.update | 更新设备模板 | update |
| template.delete | 删除设备模板 | delete |
| template.list | 列出所有模板 | list |
| template.clone | 克隆设备模板 | clone |
| template.publish | 发布模板 | publish |
| template.unpublish | 取消发布模板 | unpublish |
| template.import | 导入模板 | import |
| template.export | 导出模板 | export |
| template.version | 管理模板版本 | version |
| template.default | 设置默认模板 | default |

**应用场景**:
- 预定义设备配置模板（Android 11 标准版、Android 12 旗舰版）
- 快速批量创建设备
- 模板版本管理和回滚
- 模板导入导出实现跨环境复用

---

### 6. 设备快照 (Snapshot) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| snapshot.create | 创建设备快照 | create |
| snapshot.read | 查看快照详情 | read |
| snapshot.update | 更新快照信息 | update |
| snapshot.delete | 删除设备快照 | delete |
| snapshot.list | 列出设备快照 | list |
| snapshot.restore | 从快照恢复设备 | restore |
| snapshot.compare | 比较快照差异 | compare |
| snapshot.download | 下载快照文件 | download |
| snapshot.schedule | 定时快照管理 | schedule |
| snapshot.cleanup | 清理旧快照 | cleanup |

**应用场景**:
- 设备状态备份（应用安装前快照）
- 快速回滚到历史状态
- 定时自动快照（每天凌晨 2 点）
- 快照存储空间管理

---

### 7. 物理设备 (Physical Device) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| physical-device.create | 添加物理设备 | create |
| physical-device.read | 查看物理设备 | read |
| physical-device.update | 更新物理设备 | update |
| physical-device.delete | 删除物理设备 | delete |
| physical-device.list | 列出物理设备 | list |
| physical-device.assign | 分配物理设备 | assign |
| physical-device.unassign | 释放物理设备 | unassign |
| physical-device.monitor | 监控设备状态 | monitor |
| physical-device.maintain | 设备维护管理 | maintain |
| physical-device.stats | 设备统计数据 | stats |

**应用场景**:
- 真机云测试平台
- 物理设备池管理
- 设备健康度监控
- 设备维护计划

---

### 8. 支付管理 (Payment) - 12 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| payment.create | 创建支付订单 | create |
| payment.read | 查看支付详情 | read |
| payment.update | 更新支付信息 | update |
| payment.delete | 删除支付记录 | delete |
| payment.list | 列出支付记录 | list |
| payment.refund | 退款处理 | refund |
| payment.cancel | 取消支付 | cancel |
| payment.verify | 验证支付状态 | verify |
| payment.stats | 支付统计报表 | stats |
| payment.reconcile | 支付对账 | reconcile |
| payment.export | 导出支付数据 | export |
| payment.method | 管理支付方式 | method |

**应用场景**:
- 用户充值
- 订阅付费
- 退款处理
- 财务对账

---

### 9. 发票管理 (Invoice) - 12 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| invoice.create | 创建发票 | create |
| invoice.read | 查看发票详情 | read |
| invoice.update | 更新发票信息 | update |
| invoice.delete | 删除发票 | delete |
| invoice.list | 列出发票列表 | list |
| invoice.send | 发送发票 | send |
| invoice.void | 作废发票 | void |
| invoice.download | 下载发票 | download |
| invoice.generate | 自动生成发票 | generate |
| invoice.export | 导出发票数据 | export |
| invoice.stats | 发票统计报表 | stats |
| invoice.template | 管理发票模板 | template |

**应用场景**:
- 自动生成月度账单发票
- 企业用户开具增值税发票
- 发票邮件自动发送
- 发票归档管理

---

### 10. 订阅管理 (Subscription) - 12 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| subscription.create | 创建订阅 | create |
| subscription.read | 查看订阅详情 | read |
| subscription.update | 更新订阅信息 | update |
| subscription.delete | 删除订阅 | delete |
| subscription.list | 列出订阅列表 | list |
| subscription.cancel | 取消订阅 | cancel |
| subscription.renew | 续订 | renew |
| subscription.upgrade | 升级订阅 | upgrade |
| subscription.downgrade | 降级订阅 | downgrade |
| subscription.stats | 订阅统计分析 | stats |
| subscription.trial | 管理试用期 | trial |
| subscription.addon | 管理附加服务 | addon |

**应用场景**:
- SaaS 订阅模式
- 套餐升级/降级
- 免费试用期管理
- 订阅到期提醒

---

### 11. 套餐计划 (Plan) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| plan.create | 创建套餐计划 | create |
| plan.read | 查看套餐详情 | read |
| plan.update | 更新套餐信息 | update |
| plan.delete | 删除套餐计划 | delete |
| plan.list | 列出套餐列表 | list |
| plan.publish | 发布套餐 | publish |
| plan.archive | 归档套餐 | archive |
| plan.compare | 套餐对比 | compare |
| plan.recommend | 推荐套餐 | recommend |
| plan.pricing | 管理定价策略 | pricing |

**应用场景**:
- 基础版/专业版/企业版套餐管理
- 套餐价格调整
- 智能套餐推荐
- 套餐对比页面

---

### 12. 余额管理 (Balance) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| balance.read | 查看余额 | read |
| balance.list | 列出余额记录 | list |
| balance.recharge | 充值 | recharge |
| balance.deduct | 扣费 | deduct |
| balance.refund | 退款 | refund |
| balance.transfer | 转账 | transfer |
| balance.freeze | 冻结余额 | freeze |
| balance.unfreeze | 解冻余额 | unfreeze |
| balance.history | 余额变动历史 | history |
| balance.stats | 余额统计报表 | stats |

**应用场景**:
- 用户账户余额管理
- 自动扣费（设备使用费）
- 余额不足告警
- 余额流水记录

---

### 13. 使用量管理 (Usage) - 8 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| usage.read | 查看使用量 | read |
| usage.list | 列出使用记录 | list |
| usage.record | 记录使用量 | record |
| usage.stats | 使用量统计 | stats |
| usage.report | 生成使用报告 | report |
| usage.export | 导出使用数据 | export |
| usage.analyze | 使用量分析 | analyze |
| usage.forecast | 使用量预测 | forecast |

**应用场景**:
- 设备使用时长统计
- CPU/内存使用量记录
- 月度使用报告
- 使用趋势预测

---

### 14. 部门管理 (Department) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| department.create | 创建部门 | create |
| department.read | 查看部门信息 | read |
| department.update | 更新部门信息 | update |
| department.delete | 删除部门 | delete |
| department.list | 列出部门列表 | list |
| department.tree | 查看部门树 | tree |
| department.move | 移动部门 | move |
| department.add-member | 添加部门成员 | add-member |
| department.remove-member | 移除部门成员 | remove-member |
| department.member-list | 查看部门成员 | member-list |

**应用场景**:
- 企业组织架构管理
- 部门级数据隔离
- 部门管理员权限分配
- 跨部门协作

---

### 15. 租户管理 (Tenant) - 12 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| tenant.create | 创建租户 | create |
| tenant.read | 查看租户信息 | read |
| tenant.update | 更新租户信息 | update |
| tenant.delete | 删除租户 | delete |
| tenant.list | 列出租户列表 | list |
| tenant.activate | 激活租户 | activate |
| tenant.suspend | 暂停租户 | suspend |
| tenant.config | 配置租户 | config |
| tenant.stats | 租户统计数据 | stats |
| tenant.quota | 管理租户配额 | quota |
| tenant.billing | 租户计费管理 | billing |
| tenant.isolation | 租户数据隔离 | isolation |

**应用场景**:
- SaaS 多租户架构
- 租户数据完全隔离
- 租户级配额和计费
- 租户暂停/激活管理

---

### 16. 系统设置 (Setting) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| setting.read | 查看系统设置 | read |
| setting.update | 更新系统设置 | update |
| setting.list | 列出所有设置 | list |
| setting.import | 导入配置 | import |
| setting.export | 导出配置 | export |
| setting.reset | 重置设置 | reset |
| setting.backup | 备份配置 | backup |
| setting.restore | 恢复配置 | restore |
| setting.encrypt | 加密敏感配置 | encrypt |
| setting.validate | 验证配置有效性 | validate |

**应用场景**:
- 系统参数配置
- 配置导入导出
- 配置版本管理
- 配置灾难恢复

---

### 17. 缓存管理 (Cache) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| cache.read | 查看缓存数据 | read |
| cache.write | 写入缓存 | write |
| cache.delete | 删除缓存 | delete |
| cache.clear | 清空缓存 | clear |
| cache.list | 列出缓存键 | list |
| cache.stats | 缓存统计 | stats |
| cache.warmup | 预热缓存 | warmup |
| cache.invalidate | 失效缓存 | invalidate |
| cache.pattern-clear | 按模式清理 | pattern-clear |
| cache.config | 配置缓存策略 | config |

**应用场景**:
- Redis 缓存管理
- 缓存预热（系统启动时）
- 缓存失效策略
- 缓存命中率监控

---

### 18. 队列管理 (Queue) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| queue.read | 查看队列信息 | read |
| queue.list | 列出所有队列 | list |
| queue.create | 创建队列 | create |
| queue.delete | 删除队列 | delete |
| queue.push | 推送消息 | push |
| queue.pop | 消费消息 | pop |
| queue.purge | 清空队列 | purge |
| queue.pause | 暂停队列 | pause |
| queue.resume | 恢复队列 | resume |
| queue.stats | 队列统计 | stats |

**应用场景**:
- RabbitMQ 队列管理
- 消息积压监控
- 队列暂停/恢复
- 死信队列处理

---

### 19. 监控管理 (Monitor) - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| monitor.read | 查看监控数据 | read |
| monitor.dashboard | 查看监控面板 | dashboard |
| monitor.metrics | 查看指标数据 | metrics |
| monitor.alert | 查看告警 | alert |
| monitor.alert-config | 配置告警规则 | alert-config |
| monitor.alert-silence | 静默告警 | alert-silence |
| monitor.trace | 查看调用链追踪 | trace |
| monitor.log | 查看监控日志 | log |
| monitor.export | 导出监控数据 | export |
| monitor.analyze | 监控数据分析 | analyze |

**应用场景**:
- Prometheus + Grafana 监控
- 告警规则配置
- 分布式追踪（Jaeger）
- 性能瓶颈分析

---

### 20. Webhook 管理 - 10 个权限

| 权限代码 | 说明 | 操作类型 |
|---------|------|---------|
| webhook.create | 创建 Webhook | create |
| webhook.read | 查看 Webhook | read |
| webhook.update | 更新 Webhook | update |
| webhook.delete | 删除 Webhook | delete |
| webhook.list | 列出 Webhook | list |
| webhook.test | 测试 Webhook | test |
| webhook.trigger | 手动触发 | trigger |
| webhook.history | 查看调用历史 | history |
| webhook.retry | 重试失败请求 | retry |
| webhook.stats | Webhook 统计 | stats |

**应用场景**:
- 第三方系统集成
- 事件推送（设备创建、用户注册）
- Webhook 重试机制
- Webhook 调用日志

---

## 📈 权限统计分析

### 资源类型分布 (Top 20)

| 排名 | 资源类型 | 权限数量 | 占比 |
|------|---------|---------|------|
| 1 | device | 71 | 13.8% |
| 2 | proxy | 26 | 5.1% |
| 3 | app | 24 | 4.7% |
| 4 | user | 23 | 4.5% |
| 5 | sms | 22 | 4.3% |
| 6 | quota | 15 | 2.9% |
| 7 | payment | 12 | 2.3% |
| 8 | notification | 12 | 2.3% |
| 9 | tenant | 12 | 2.3% |
| 10 | invoice | 12 | 2.3% |
| 11 | template | 12 | 2.3% |
| 12 | ticket | 12 | 2.3% |
| 13 | subscription | 12 | 2.3% |
| 14 | proxy-report | 11 | 2.1% |
| 15 | monitor | 10 | 1.9% |
| 16 | department | 10 | 1.9% |
| 17 | cache | 10 | 1.9% |
| 18 | proxy-audit | 10 | 1.9% |
| 19 | snapshot | 10 | 1.9% |
| 20 | queue | 10 | 1.9% |

### 操作类型分布 (Top 15)

| 排名 | 操作类型 | 权限数量 | 占比 |
|------|---------|---------|------|
| 1 | read | 53 | 10.3% |
| 2 | create | 47 | 9.1% |
| 3 | delete | 38 | 7.4% |
| 4 | update | 30 | 5.8% |
| 5 | stats | 25 | 4.9% |
| 6 | list | 24 | 4.7% |
| 7 | export | 10 | 1.9% |
| 8 | request | 10 | 1.9% |
| 9 | approve | 10 | 1.9% |
| 10 | view | 9 | 1.8% |
| 11 | send | 8 | 1.6% |
| 12 | execute | 7 | 1.4% |
| 13 | cancel | 5 | 1.0% |
| 14 | use | 5 | 1.0% |
| 15 | history | 4 | 0.8% |

---

## 🔧 技术实施

### SQL 脚本

**文件**: `/home/eric/next-cloudphone/database/rbac-missing-core-permissions-v2.sql`

**执行方式**:
```bash
docker compose -f docker-compose.dev.yml exec -T postgres \
  psql -U postgres -d cloudphone_user < database/rbac-missing-core-permissions-v2.sql
```

**关键特性**:
- ✅ 使用 `ON CONFLICT (name) DO NOTHING` 避免重复插入
- ✅ 事务包装（BEGIN/COMMIT）确保原子性
- ✅ 自动生成 UUID（不使用固定 ID）
- ✅ 插入后自动统计验证

### 权限分配

所有新增权限已自动分配给 `super_admin` 角色：

```sql
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  '00000000-0000-0000-0000-000000000000',  -- super_admin
  p.id
FROM permissions p
WHERE p.id NOT IN (
  SELECT permission_id
  FROM role_permissions
  WHERE role_id = '00000000-0000-0000-0000-000000000000'
);
```

**结果**: super_admin 现在拥有 514/514 权限（100% 覆盖）

---

## ✅ 验证检查

### 1. 权限总数验证

```sql
SELECT COUNT(*) FROM permissions;
-- 预期: 514
```

✅ **通过**: 514 个权限

### 2. super_admin 权限覆盖率

```sql
SELECT COUNT(*) FROM role_permissions
WHERE role_id = '00000000-0000-0000-0000-000000000000';
-- 预期: 514
```

✅ **通过**: 514/514 (100%)

### 3. superadmin 用户配置

```sql
SELECT COUNT(DISTINCT p.id)
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = 'superadmin';
-- 预期: 514
```

✅ **通过**: 514 个权限 + 50 个菜单

### 4. 缺失权限检查

```sql
SELECT COUNT(*) FROM permissions p
WHERE p.id NOT IN (
  SELECT permission_id FROM role_permissions
  WHERE role_id = '00000000-0000-0000-0000-000000000000'
);
-- 预期: 0
```

✅ **通过**: 0 个缺失权限

---

## 📚 相关文档

- **菜单权限指南**: `docs/MENU_PERMISSIONS_GUIDE.md`
- **RBAC 优化结果**: `docs/RBAC_OPTIMIZATION_RESULTS.md`
- **菜单系统集成**: `docs/RBAC_MENU_INTEGRATION_COMPLETE.md`

---

## 🎯 后续建议

### 1. 角色权限分配（短期）

为其他角色分配适当的权限：

| 角色 | 建议权限数 | 重点模块 |
|------|-----------|---------|
| admin | ~400 | 除租户/系统设置外的所有模块 |
| tenant_admin | ~250 | 租户级管理权限 |
| department_admin | ~150 | 部门级管理权限 |
| billing_admin | ~80 | 计费相关模块 |
| user | ~50 | 基础查看和操作权限 |

### 2. 权限测试（中期）

- [ ] 单元测试：每个权限的 Guard 验证
- [ ] 集成测试：角色权限组合测试
- [ ] E2E 测试：不同角色的用户操作流程

### 3. 权限文档（中期）

- [ ] 为每个模块创建详细的权限使用文档
- [ ] 添加权限决策流程图
- [ ] 创建权限快速参考手册

### 4. 权限优化（长期）

- [ ] 权限使用热度分析（识别未使用的权限）
- [ ] 权限依赖关系可视化
- [ ] 动态权限更新机制（无需重启服务）
- [ ] 权限模板系统（快速为新角色分配权限）

---

## 📞 问题排查

### 查看所有资源类型

```sql
SELECT DISTINCT resource FROM permissions ORDER BY resource;
```

### 查看特定资源的所有权限

```sql
SELECT name, description, action
FROM permissions
WHERE resource = 'quota'
ORDER BY action;
```

### 检查角色权限数量

```sql
SELECT r.name, COUNT(rp.permission_id) as 权限数
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.name
ORDER BY COUNT(rp.permission_id) DESC;
```

### 查找缺少某个权限的角色

```sql
SELECT r.name
FROM roles r
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  JOIN permissions p ON rp.permission_id = p.id
  WHERE rp.role_id = r.id
    AND p.name = 'quota.create'
);
```

---

**生成时间**: 2025-11-06
**执行人员**: Claude Code
**审核状态**: 待审核
**版本**: v2.0
