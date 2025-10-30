# 项目文档索引

本目录包含云手机平台的所有项目文档，按类型组织。

## 📁 目录结构

### `/guides` - 指南和参考文档
开发和部署相关的指南文档：
- [DEPLOYMENT_GUIDE.md](guides/DEPLOYMENT_GUIDE.md) - 完整部署指南
- [TESTING_GUIDE.md](guides/TESTING_GUIDE.md) - 测试指南
- [QUICK_REFERENCE.md](guides/QUICK_REFERENCE.md) - 快速参考
- [NEXT_PHASE_PLAN.md](guides/NEXT_PHASE_PLAN.md) - 下一阶段计划
- [NEXT_TESTING_PRIORITIES.md](guides/NEXT_TESTING_PRIORITIES.md) - 测试优先级
- [ENV_CONFIG_TEMPLATE.md](guides/ENV_CONFIG_TEMPLATE.md) - 环境配置模板
- [TEST_ACCOUNTS.md](guides/TEST_ACCOUNTS.md) - 测试账号

### `/reports` - 审计和评估报告
系统审计、代码质量和架构评估报告：
- [SECURITY_AUDIT_REPORT.md](reports/SECURITY_AUDIT_REPORT.md) - 安全审计报告
- [BACKEND_ARCHITECTURE_REVIEW_SUMMARY.md](reports/BACKEND_ARCHITECTURE_REVIEW_SUMMARY.md) - 后端架构评审
- [CODE_QUALITY_OPTIMIZATION_SUMMARY.md](reports/CODE_QUALITY_OPTIMIZATION_SUMMARY.md) - 代码质量优化总结
- [代码质量详细评估报告.md](reports/代码质量详细评估报告.md) - 代码质量详细报告（中文）
- [后端健康检查报告.md](reports/后端健康检查报告.md) - 后端健康检查报告（中文）
- [安全审计报告_中文摘要.md](reports/安全审计报告_中文摘要.md) - 安全审计中文摘要

### `/summaries` - 完成总结
各阶段和功能的完成总结文档：
- [FINAL_SUMMARY.md](summaries/FINAL_SUMMARY.md) - 项目总结
- [FINAL_SESSION_SUMMARY_2025-10-30.md](summaries/FINAL_SESSION_SUMMARY_2025-10-30.md) - 最终会话总结
- [ARCHITECTURE_DEPLOYMENT_COMPLETE.md](summaries/ARCHITECTURE_DEPLOYMENT_COMPLETE.md) - 架构部署完成
- [ARCHITECTURE_FIXES_COMPLETED.md](summaries/ARCHITECTURE_FIXES_COMPLETED.md) - 架构修复完成
- [DEPLOYMENT_STATUS_FINAL.md](summaries/DEPLOYMENT_STATUS_FINAL.md) - 部署状态
- [DEPLOYMENT_VERIFICATION.md](summaries/DEPLOYMENT_VERIFICATION.md) - 部署验证
- [DATABASE_SEPARATION_ARCHITECTURE_VALIDATED.md](summaries/DATABASE_SEPARATION_ARCHITECTURE_VALIDATED.md) - 数据库分离验证
- [FRONTEND_OPTIMIZATION_SUMMARY.md](summaries/FRONTEND_OPTIMIZATION_SUMMARY.md) - 前端优化总结
- [P1_BACKEND_OPTIMIZATION_COMPLETE.md](summaries/P1_BACKEND_OPTIMIZATION_COMPLETE.md) - P1 后端优化完成
- [PHASE3_COMPLETE_ALL_SERVICES.md](summaries/PHASE3_COMPLETE_ALL_SERVICES.md) - Phase 3 完成
- [PHASE3_COMPLETE_SUMMARY.md](summaries/PHASE3_COMPLETE_SUMMARY.md) - Phase 3 总结
- [PHASE4_PERFORMANCE_SERVICES_PLAN.md](summaries/PHASE4_PERFORMANCE_SERVICES_PLAN.md) - Phase 4 性能服务计划
- [RABBITMQ_UNIFICATION_COMPLETE.md](summaries/RABBITMQ_UNIFICATION_COMPLETE.md) - RabbitMQ 统一完成
- [SAGA_CONFIGURATION_COMPLETE.md](summaries/SAGA_CONFIGURATION_COMPLETE.md) - Saga 配置完成
- [SERVICE_LAYER_TESTING_COMPLETE_2025-10-30.md](summaries/SERVICE_LAYER_TESTING_COMPLETE_2025-10-30.md) - 服务层测试完成
- [SERVICE_TO_SERVICE_AUTH_IMPLEMENTATION_COMPLETE.md](summaries/SERVICE_TO_SERVICE_AUTH_IMPLEMENTATION_COMPLETE.md) - 服务间认证完成
- [TESTING_INFRASTRUCTURE_COMPLETE.md](summaries/TESTING_INFRASTRUCTURE_COMPLETE.md) - 测试基础设施完成
- [INTERNAL_RATE_LIMITING_IMPLEMENTATION_COMPLETE.md](summaries/INTERNAL_RATE_LIMITING_IMPLEMENTATION_COMPLETE.md) - 内部限流完成
- [事务修复_最终总结报告.md](summaries/事务修复_最终总结报告.md) - 事务修复总结（中文）

### `/archive` - 历史文档归档
过程文档和阶段性报告归档：

#### `/archive/phase-reports` - 各阶段详细报告
包含 Phase 1-9 的详细进度报告和完成报告

#### `/archive/session-reports` - 会话报告
包含各个开发会话的工作总结

#### `/archive/old-summaries` - 旧版总结
包含被更新文档替代的旧版总结和中间过程文档

## 🔍 快速查找

### 我想了解如何...
- **部署系统** → [guides/DEPLOYMENT_GUIDE.md](guides/DEPLOYMENT_GUIDE.md)
- **运行测试** → [guides/TESTING_GUIDE.md](guides/TESTING_GUIDE.md)
- **快速上手** → [guides/QUICK_REFERENCE.md](guides/QUICK_REFERENCE.md)
- **配置环境** → [guides/ENV_CONFIG_TEMPLATE.md](guides/ENV_CONFIG_TEMPLATE.md)

### 我想查看...
- **安全审计结果** → [reports/SECURITY_AUDIT_REPORT.md](reports/SECURITY_AUDIT_REPORT.md)
- **代码质量报告** → [reports/CODE_QUALITY_OPTIMIZATION_SUMMARY.md](reports/CODE_QUALITY_OPTIMIZATION_SUMMARY.md)
- **架构评审** → [reports/BACKEND_ARCHITECTURE_REVIEW_SUMMARY.md](reports/BACKEND_ARCHITECTURE_REVIEW_SUMMARY.md)

### 我想了解项目进展...
- **总体进展** → [summaries/FINAL_SUMMARY.md](summaries/FINAL_SUMMARY.md)
- **架构完成情况** → [summaries/ARCHITECTURE_DEPLOYMENT_COMPLETE.md](summaries/ARCHITECTURE_DEPLOYMENT_COMPLETE.md)
- **测试覆盖率** → [summaries/SERVICE_LAYER_TESTING_COMPLETE_2025-10-30.md](summaries/SERVICE_LAYER_TESTING_COMPLETE_2025-10-30.md)

## 📝 文档维护

- **主要文档**: 保持在对应的功能目录下（guides/reports/summaries）
- **过程文档**: 完成后移至 archive 对应子目录
- **重复文档**: 保留最新版本，旧版本归档
- **命名规范**:
  - 指南文档: `*_GUIDE.md`
  - 报告文档: `*_REPORT.md` 或 `*_AUDIT.md`
  - 总结文档: `*_COMPLETE.md` 或 `*_SUMMARY.md`
  - 归档文档: `*_PROGRESS.md` (进度) 或 `PHASE*_*.md` (阶段报告)

## 🌐 语言

文档支持中英双语：
- 英文文档：技术实现细节、代码示例
- 中文文档：总结报告、审计报告、业务说明

---

最后更新: 2025-10-30
