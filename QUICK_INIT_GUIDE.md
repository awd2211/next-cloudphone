# 🚀 快速初始化指南

## ✅ 数据库配置已验证

所有微服务的数据库配置都是正确且一致的：

| 服务 | 数据库 | 状态 |
|------|--------|------|
| user-service | cloudphone_user | ✅ |
| device-service | cloudphone_device | ✅ |
| billing-service | cloudphone_billing | ✅ |
| app-service | cloudphone_app | ✅ |
| notification-service | cloudphone_notification | ✅ |

---

## ⚠️ 需要初始化数据（3步）

### 第1步：初始化套餐数据

```bash
cd backend/billing-service
pnpm seed
```

**结果**: 创建5个套餐（free, basic, pro, enterprise, payg）

---

### 第2步：初始化通知模板

```bash
cd backend/notification-service
npx ts-node src/scripts/init-templates.ts
```

**结果**: 创建30+个通知模板

---

### 第3步：初始化系统设置

```bash
# 先通过前端或 API 登录获取 admin token
curl -X POST http://localhost:30000/settings/initialize \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**结果**: 创建默认系统配置

---

## 🎯 完成后验证

```bash
# 检查套餐
curl http://localhost:30000/plans/public

# 检查模板
curl http://localhost:30000/templates

# 检查服务健康
pm2 list
```

---

## 📝 完成清单

- [x] 所有数据库已创建
- [x] 所有表结构已创建
- [x] 数据库配置已验证一致
- [ ] Plans 数据初始化（运行上面第1步）
- [ ] Templates 数据初始化（运行上面第2步）
- [ ] Settings 数据初始化（运行上面第3步）

**执行完这3步，系统就100%准备就绪！** 🎉

