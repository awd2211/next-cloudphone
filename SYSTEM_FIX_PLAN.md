# 系统修复执行计划
**创建时间**: 2025-10-31 09:20:00
**预计总时长**: 4-5小时
**优先级**: P0 → P1 → P2

---

## 📋 计划概览

基于系统诊断报告,我们将分阶段修复所有发现的问题。按照影响程度和紧急性排序。

```
Phase 1 (P0): 修复核心功能问题          ⏱️  30分钟
Phase 2 (P1): 修复TypeScript错误       ⏱️  2-3小时
Phase 3 (P1): 构建和启动前端           ⏱️  30分钟
Phase 4 (P2): 性能优化和监控           ⏱️  1小时
```

---

## 🔴 Phase 1: 修复核心功能 (P0 - 紧急)

**目标**: 恢复Device Service的Docker和ADB功能
**预计时间**: 30分钟
**影响范围**: 设备管理核心功能

### Task 1.1: 修复Docker Socket连接 ⏱️ 5分钟

**问题**: `connect ENOENT unix:///var/run/docker.sock`

**根本原因**: Docker socket权限不足或服务未运行

**执行步骤**:
```bash
# 1. 检查Docker服务状态
sudo systemctl status docker

# 2. 如果未运行,启动Docker
sudo systemctl start docker
sudo systemctl enable docker

# 3. 设置socket权限 (开发环境)
sudo chmod 666 /var/run/docker.sock

# 4. 验证Docker可访问
docker ps

# 5. 检查当前用户是否在docker组
groups $USER

# 6. 如果不在,添加到docker组 (更安全的长期方案)
sudo usermod -aG docker $USER
# 注意: 需要重新登录才生效
```

**验证**:
```bash
# 测试Docker连接
docker run --rm hello-world

# 检查socket权限
ls -la /var/run/docker.sock
```

**成功标准**:
- Docker命令可以正常执行
- socket权限显示为`srw-rw-rw-`

---

### Task 1.2: 安装和配置ADB工具 ⏱️ 10分钟

**问题**: `spawn adb ENOENT`

**根本原因**: ADB (Android Debug Bridge) 未安装

**执行步骤**:
```bash
# 1. 更新包管理器
sudo apt-get update

# 2. 安装Android工具
sudo apt-get install -y android-tools-adb android-tools-fastboot

# 3. 验证安装
which adb
adb version

# 4. 启动ADB服务器
adb start-server

# 5. 检查ADB设备连接
adb devices
```

**预期输出**:
```
adb version
Android Debug Bridge version 1.0.xx
```

**成功标准**:
- `which adb` 返回路径 (通常是 `/usr/bin/adb`)
- `adb version` 显示版本信息
- `adb devices` 命令可执行

---

### Task 1.3: 重启Device Service并验证 ⏱️ 5分钟

**执行步骤**:
```bash
# 1. 重启device-service
pm2 restart device-service

# 2. 等待服务启动
sleep 5

# 3. 检查服务状态
pm2 list | grep device-service

# 4. 检查健康状态
curl -s http://localhost:30002/health | jq .

# 5. 检查详细健康状态
curl -s http://localhost:30002/health/detailed | jq .
```

**验证检查点**:
- PM2显示状态为 `online`
- 健康检查返回 `"status": "ok"` (不再是degraded)
- Docker依赖: `"status": "healthy"`
- ADB依赖: `"status": "healthy"`

**回滚计划** (如果失败):
```bash
# 查看日志
pm2 logs device-service --lines 50

# 检查配置
cat backend/device-service/.env | grep -E "DOCKER|ADB"

# 手动测试Docker
cd backend/device-service
node -e "const Docker = require('dockerode'); const docker = new Docker(); docker.ping().then(console.log).catch(console.error);"
```

---

## 🟡 Phase 2: 修复TypeScript错误 (P1 - 重要)

**目标**: 修复Device Service的20个TypeScript错误
**预计时间**: 2-3小时
**影响范围**: 代码质量、类型安全、编译成功

### 准备工作

```bash
# 1. 创建修复分支
cd /home/eric/next-cloudphone
git checkout -b fix/device-service-typescript-errors

# 2. 确保依赖已安装
cd backend/device-service
pnpm install

# 3. 运行TypeScript检查,保存错误列表
npx tsc --noEmit 2>&1 | tee /tmp/device-service-ts-errors.log

# 4. 统计错误数量
cat /tmp/device-service-ts-errors.log | grep "error TS" | wc -l
```

---

### Task 2.1: 安装缺失的Redis依赖 ⏱️ 15分钟

**问题**:
```
error TS2307: Cannot find module '@liaoliaots/nestjs-redis'
```

**影响文件** (2个):
- `src/common/guards/rate-limit.guard.ts:11`
- `src/common/guards/throttle.guard.ts:11`

**分析**:
这个包可能已被重命名或弃用。需要检查正确的包名。

**执行步骤**:
```bash
cd backend/device-service

# 1. 检查当前Redis相关依赖
pnpm list | grep redis

# 2. 搜索正确的NestJS Redis包
npm search @nestjs redis

# 3. 安装正确的包 (可能是以下之一)
# 选项A: 官方新包
pnpm add @nestjs/redis ioredis

# 选项B: 社区包
pnpm add @liaoliaots/nestjs-redis

# 选项C: 如果已在@cloudphone/shared中,检查导入路径
# 可能需要从 @cloudphone/shared 导入
```

**修复代码**:

如果需要更新导入语句:
```typescript
// 修改前
import { InjectRedis } from '@liaoliaots/nestjs-redis';

// 修改后 (根据实际安装的包)
import { InjectRedis } from '@cloudphone/shared';
// 或
import { InjectRedis } from '@nestjs/redis';
```

**验证**:
```bash
npx tsc --noEmit 2>&1 | grep "@liaoliaots/nestjs-redis"
# 应该无输出
```

---

### Task 2.2: 实现releaseAllocation方法 ⏱️ 45分钟

**问题**:
```
error TS2339: Property 'releaseAllocation' does not exist on type 'AllocationService'
```

**影响文件** (9个错误):
- `src/scheduler/allocation.service.ts:791`
- `src/scheduler/consumers/billing-events.consumer.ts:104, 241`
- `src/scheduler/consumers/device-events.consumer.ts:67, 144, 209, 260`
- `src/scheduler/consumers/user-events.consumer.ts:73, 141, 234, 316`

**分析**:
`AllocationService`类中缺少`releaseAllocation`方法,但在多处被调用。需要实现这个方法。

**实现步骤**:

1. **先分析现有代码结构**:
```bash
# 查看AllocationService的现有方法
grep -n "async.*(" backend/device-service/src/scheduler/allocation.service.ts | head -20

# 查看releaseAllocation的调用方式
grep -B2 -A2 "releaseAllocation" backend/device-service/src/scheduler/consumers/*.consumer.ts | head -30
```

2. **查看调用示例**,理解方法签名:
```typescript
// 从调用处推断方法签名
await this.allocationService.releaseAllocation(allocationId);
await this.allocationService.releaseAllocation(allocation.id);
```

3. **实现方法** (在`src/scheduler/allocation.service.ts`中):

```typescript
/**
 * 释放设备分配
 * @param allocationId 分配ID
 * @returns 是否成功释放
 */
async releaseAllocation(allocationId: string): Promise<boolean> {
  try {
    // 1. 查找分配记录
    const allocation = await this.allocationRepository.findOne({
      where: { id: allocationId },
      relations: ['device'],
    });

    if (!allocation) {
      this.logger.warn(`Allocation not found: ${allocationId}`);
      return false;
    }

    // 2. 检查分配状态
    if (allocation.status === 'released') {
      this.logger.warn(`Allocation already released: ${allocationId}`);
      return true;
    }

    // 3. 更新分配状态
    allocation.status = 'released';
    allocation.releasedAt = new Date();
    await this.allocationRepository.save(allocation);

    // 4. 如果设备存在,更新设备状态
    if (allocation.device) {
      allocation.device.status = 'available';
      allocation.device.currentAllocationId = null;
      await this.deviceRepository.save(allocation.device);
    }

    // 5. 发布事件
    await this.eventBus.publishDeviceEvent('allocation.released', {
      allocationId: allocation.id,
      deviceId: allocation.deviceId,
      userId: allocation.userId,
      releasedAt: allocation.releasedAt,
    });

    this.logger.log(`Successfully released allocation: ${allocationId}`);
    return true;

  } catch (error) {
    this.logger.error(`Failed to release allocation ${allocationId}:`, error);
    throw error;
  }
}
```

**添加必要的导入**:
```typescript
import { EventBusService } from '@cloudphone/shared';
```

**验证**:
```bash
# 检查releaseAllocation错误是否消失
npx tsc --noEmit 2>&1 | grep "releaseAllocation"
# 应该无输出
```

---

### Task 2.3: 修复类型不匹配问题 ⏱️ 20分钟

**问题**:
```
error TS2322: Type 'string | null' is not assignable to type 'string | undefined'
error TS2322: Type 'number | null' is not assignable to type 'number | undefined'
```

**影响文件**:
- `src/scheduler/allocation.service.ts:238-239`

**分析**:
数据库返回的可能是`null`,但TypeScript期望`undefined`。

**修复方案A** - 类型转换:
```typescript
// 修改前
someField: dbResult.field,  // field可能是null

// 修改后
someField: dbResult.field ?? undefined,
```

**修复方案B** - 调整类型定义:
```typescript
// 在DTO或接口中
interface AllocationDto {
  someField: string | null | undefined;  // 允许null
  anotherField: number | null | undefined;
}
```

**执行步骤**:
```bash
# 1. 查看具体错误位置
sed -n '235,242p' backend/device-service/src/scheduler/allocation.service.ts

# 2. 应用修复 (使用Edit工具)

# 3. 验证
npx tsc --noEmit 2>&1 | grep "TS2322"
```

---

### Task 2.4: 修复属性名拼写错误 ⏱️ 5分钟

**问题**:
```
error TS2551: Property 'expiresAt' does not exist. Did you mean 'expiredAt'?
```

**影响文件**:
- `src/scheduler/notification-client.service.ts:226`

**修复**:
```typescript
// 修改前
notification.expiresAt

// 修改后
notification.expiredAt
```

**执行**:
```bash
# 查看上下文
sed -n '220,230p' backend/device-service/src/scheduler/notification-client.service.ts

# 使用Edit工具修复
```

---

### Task 2.5: 修复模块导入路径 ⏱️ 10分钟

**问题**:
```
error TS2307: Cannot find module '../notifications/notification.client'
```

**影响文件**:
- `src/scheduler/queue.service.ts:29`

**执行步骤**:
```bash
# 1. 查找正确的notification client位置
find backend/device-service/src -name "*notification*client*"

# 2. 检查当前导入
sed -n '25,35p' backend/device-service/src/scheduler/queue.service.ts

# 3. 更正导入路径
```

**可能的正确路径**:
```typescript
// 选项1: 在同级目录
import { NotificationClient } from './notification-client.service';

// 选项2: 从shared导入
import { NotificationClient } from '@cloudphone/shared';

// 选项3: 绝对路径
import { NotificationClient } from '../notification/notification-client.service';
```

---

### Task 2.6: 添加null检查 ⏱️ 15分钟

**问题**:
```
error TS18047: 'updatedEntry' is possibly 'null'
```

**影响文件**:
- `src/scheduler/queue.service.ts:123` (2处)

**修复方案**:
```typescript
// 修改前
const result = updatedEntry.someProperty;

// 修改后 - 选项A: 可选链
const result = updatedEntry?.someProperty;

// 修改后 - 选项B: 明确检查
if (!updatedEntry) {
  throw new Error('Updated entry not found');
}
const result = updatedEntry.someProperty;

// 修改后 - 选项C: 使用非空断言 (如果确定不会为null)
const result = updatedEntry!.someProperty;
```

**执行**:
```bash
# 查看上下文
sed -n '118,128p' backend/device-service/src/scheduler/queue.service.ts
```

---

### Task 2.7: 修复ApiProperty装饰器参数 ⏱️ 10分钟

**问题**:
```
error TS2345: Argument of type is not assignable to parameter of type 'ApiPropertyOptions'
```

**影响文件**:
- `src/scheduler/dto/batch-allocation.dto.ts:319`

**分析**:
ApiProperty装饰器的参数格式不正确。

**执行**:
```bash
# 查看问题代码
sed -n '315,325p' backend/device-service/src/scheduler/dto/batch-allocation.dto.ts

# 检查ApiProperty的正确用法
grep -A5 "@ApiProperty" backend/device-service/src/scheduler/dto/*.dto.ts | head -20
```

**可能的修复**:
```typescript
// 确保example格式正确
@ApiProperty({
  description: 'Batch allocation results by user',
  type: 'object',
  example: {
    'user-1': [
      {
        allocationId: 'alloc-1',
        deviceId: 'device-1',
        expiresAt: '2025-11-01T00:00:00Z',
      },
    ],
  },
  // 添加additionalProperties如果需要
  additionalProperties: {
    type: 'array',
    items: { type: 'object' },
  },
})
```

---

### Phase 2 验证

完成所有TypeScript错误修复后:

```bash
cd backend/device-service

# 1. 完整TypeScript检查
npx tsc --noEmit

# 2. 应该显示: 无错误
# 输出应该为空,或显示 "Found 0 errors"

# 3. 运行测试
pnpm test

# 4. 构建项目
pnpm build

# 5. 检查编译产物
ls -lh dist/

# 6. 重启服务
pm2 restart device-service

# 7. 验证服务运行
curl http://localhost:30002/health
```

**成功标准**:
- ✅ TypeScript编译无错误
- ✅ 所有单元测试通过
- ✅ 项目构建成功
- ✅ 服务正常启动

---

## 🟡 Phase 3: 构建和启动前端 (P1)

**目标**: 构建前端应用并启动服务
**预计时间**: 30分钟
**影响范围**: Web界面可访问性

### Task 3.1: 构建User Frontend ⏱️ 10分钟

```bash
# 1. 进入user前端目录
cd /home/eric/next-cloudphone/frontend/user

# 2. 确保依赖已安装
pnpm install

# 3. 检查环境变量
cat .env.development

# 4. 如果不存在,创建.env.development
cat > .env.development << 'EOF'
VITE_API_URL=http://localhost:30000
VITE_WS_URL=ws://localhost:30006
NODE_ENV=development
EOF

# 5. 构建项目 (生产模式)
pnpm build

# 6. 验证构建产物
ls -lh dist/
ls dist/assets/

# 7. 启动服务
pm2 restart user-frontend

# 8. 等待启动
sleep 3

# 9. 验证
pm2 list | grep user-frontend
curl -I http://localhost:5174
```

**预期结果**:
- `dist/` 目录包含 `index.html` 和 `assets/`
- PM2显示状态为 `online`
- 访问 http://localhost:5174 返回200

---

### Task 3.2: 构建Admin Frontend ⏱️ 10分钟

```bash
# 1. 进入admin前端目录
cd /home/eric/next-cloudphone/frontend/admin

# 2. 确保依赖已安装
pnpm install

# 3. 检查环境变量
cat .env.development

# 4. 如果不存在,创建.env.development
cat > .env.development << 'EOF'
VITE_API_URL=http://localhost:30000
VITE_WS_URL=ws://localhost:30006
NODE_ENV=development
EOF

# 5. 构建项目
pnpm build

# 6. 验证构建产物
ls -lh dist/
ls dist/assets/

# 7. 启动服务
pm2 restart admin-frontend

# 8. 等待启动
sleep 3

# 9. 验证
pm2 list | grep admin-frontend
curl -I http://localhost:5173
```

---

### Task 3.3: 验证前端功能 ⏱️ 10分钟

```bash
# 1. 检查所有前端服务状态
pm2 list | grep frontend

# 2. 检查前端是否可以访问API
# User Frontend
curl http://localhost:5174 | grep "<!DOCTYPE html"

# Admin Frontend
curl http://localhost:5173 | grep "<!DOCTYPE html"

# 3. 测试API连接
curl http://localhost:30000/health

# 4. 检查WebSocket连接
curl http://localhost:30006/health
```

**手动测试** (在浏览器):
1. 访问 http://localhost:5174 (User Portal)
2. 访问 http://localhost:5173 (Admin Dashboard)
3. 检查控制台无错误
4. 测试登录功能

---

## 🟢 Phase 4: 性能优化和监控 (P2)

**目标**: 调查并优化系统性能问题
**预计时间**: 1小时
**影响范围**: 系统稳定性和性能

### Task 4.1: 调查API Gateway频繁重启 ⏱️ 30分钟

**问题**: API Gateway已重启2784次

**调查步骤**:

```bash
# 1. 收集最近的日志
pm2 logs api-gateway --lines 500 > /tmp/api-gateway-logs.txt

# 2. 分析错误模式
grep -i "error\|exception\|restart" /tmp/api-gateway-logs.txt | tail -50

# 3. 检查内存使用历史
pm2 describe api-gateway | grep -A10 "memory"

# 4. 查看PM2配置
cat ecosystem.config.js | grep -A10 "api-gateway"

# 5. 检查是否有内存泄漏
# 查看重启原因
pm2 logs api-gateway --lines 200 | grep -B5 "restart"

# 6. 监控实时内存使用
pm2 monit  # 运行几分钟,观察内存增长
```

**可能的原因和修复**:

1. **内存限制过低**:
```javascript
// ecosystem.config.js
{
  name: 'api-gateway',
  max_memory_restart: '500M',  // 增加到更高值
}
```

2. **代码错误导致崩溃**:
```bash
# 检查代码中的未捕获异常
cd backend/api-gateway
grep -r "throw new" src/ | wc -l
```

3. **依赖冲突**:
```bash
cd backend/api-gateway
pnpm list --depth=0 | grep -i "deprecated\|missing"
```

---

### Task 4.2: 完善Consul服务注册 ⏱️ 20分钟

**问题**: 只有2/6服务在Consul注册

**执行步骤**:

```bash
# 1. 检查当前Consul注册
curl -s http://localhost:8500/v1/catalog/services | jq .

# 2. 检查各服务的Consul配置
for service in user-service device-service app-service; do
  echo "=== $service ==="
  grep -A10 "ConsulModule" backend/$service/src/app.module.ts
  echo ""
done

# 3. 检查环境变量
for service in user-service device-service app-service; do
  echo "=== $service ==="
  cat backend/$service/.env | grep CONSUL
  echo ""
done

# 4. 检查Consul日志
docker compose -f docker-compose.dev.yml logs consul --tail=50

# 5. 手动测试注册
# 查看服务启动日志中的Consul注册信息
pm2 logs user-service --lines 100 | grep -i consul
```

**修复方案**:

如果服务配置正确但未注册,可能需要:

1. **确认Consul配置在app.module.ts中**:
```typescript
import { ConsulModule } from '@cloudphone/shared';

@Module({
  imports: [
    ConsulModule.forRoot({
      host: process.env.CONSUL_HOST || 'localhost',
      port: parseInt(process.env.CONSUL_PORT) || 8500,
      serviceName: 'user-service',
      servicePort: parseInt(process.env.PORT) || 30001,
    }),
    // ... 其他模块
  ],
})
```

2. **重启服务使其重新注册**:
```bash
pm2 restart user-service
pm2 restart device-service
pm2 restart app-service

# 等待几秒
sleep 5

# 验证注册
curl -s http://localhost:8500/v1/catalog/services | jq .
```

---

### Task 4.3: 设置监控和告警 ⏱️ 10分钟

```bash
# 1. 创建健康检查脚本
cat > /home/eric/next-cloudphone/scripts/health-monitor.sh << 'EOF'
#!/bin/bash
# 健康监控脚本

SERVICES=(30000 30001 30002 30003 30005 30006)
ALERT_FILE="/tmp/service-alerts.log"

for port in "${SERVICES[@]}"; do
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
  if [ "$response" != "200" ]; then
    echo "$(date) - ALERT: Service on port $port is unhealthy (HTTP $response)" | tee -a $ALERT_FILE
  fi
done

# 检查PM2进程
pm2 list | grep stopped && echo "$(date) - ALERT: Some PM2 processes are stopped" | tee -a $ALERT_FILE

echo "$(date) - Health check completed"
EOF

chmod +x /home/eric/next-cloudphone/scripts/health-monitor.sh

# 2. 添加到crontab (每5分钟检查)
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/eric/next-cloudphone/scripts/health-monitor.sh") | crontab -

# 3. 验证crontab
crontab -l | grep health-monitor

# 4. 手动运行测试
/home/eric/next-cloudphone/scripts/health-monitor.sh
```

---

## ✅ 最终验证

完成所有修复后,执行全面验证:

```bash
cd /home/eric/next-cloudphone

# 1. 创建验证脚本
cat > scripts/final-verification.sh << 'EOF'
#!/bin/bash
echo "========================================="
echo "  系统修复验证报告"
echo "========================================="
echo ""

echo "📊 后端服务状态:"
pm2 list

echo ""
echo "🏥 健康检查:"
for port in 30000 30001 30002 30003 30005 30006; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health | jq -r '.status // "ERROR"'
done

echo ""
echo "🐳 基础设施状态:"
docker compose -f docker-compose.dev.yml ps --format "table {{.Service}}\t{{.Status}}"

echo ""
echo "💻 前端服务:"
curl -s -o /dev/null -w "User Frontend (5174): %{http_code}\n" http://localhost:5174
curl -s -o /dev/null -w "Admin Frontend (5173): %{http_code}\n" http://localhost:5173

echo ""
echo "🔍 TypeScript检查:"
cd backend/device-service
ERROR_COUNT=$(npx tsc --noEmit 2>&1 | grep -c "error TS")
if [ "$ERROR_COUNT" -eq 0 ]; then
  echo "✅ Device Service: 无TypeScript错误"
else
  echo "❌ Device Service: $ERROR_COUNT 个TypeScript错误"
fi

echo ""
echo "📈 Consul服务注册:"
curl -s http://localhost:8500/v1/catalog/services | jq 'keys'

echo ""
echo "========================================="
echo "  验证完成"
echo "========================================="
EOF

chmod +x scripts/final-verification.sh

# 2. 运行验证
./scripts/final-verification.sh

# 3. 生成最终报告
./scripts/final-verification.sh > SYSTEM_FIX_COMPLETION_REPORT.txt
```

---

## 📊 成功指标

修复完成后,系统应该满足以下指标:

| 指标 | 修复前 | 目标 | 验证方法 |
|-----|-------|------|---------|
| 后端服务可用性 | 85% | 100% | 所有服务health返回OK |
| Device Service状态 | Degraded | OK | Docker和ADB健康 |
| TypeScript错误 | 20个 | 0个 | tsc --noEmit无错误 |
| 前端可访问性 | 0% | 100% | 两个前端都返回200 |
| PM2服务在线 | 4/8 | 8/8 | pm2 list全部online |
| Consul注册 | 2/6 | 6/6 | 所有服务已注册 |

---

## 🔄 回滚计划

如果任何阶段出现问题,使用以下回滚步骤:

```bash
# 1. 回滚代码更改
git checkout main
git branch -D fix/device-service-typescript-errors

# 2. 恢复服务
pm2 restart all

# 3. 检查备份
ls -lh backend/device-service/dist.backup/ 2>/dev/null

# 4. 如果有备份,恢复
if [ -d "backend/device-service/dist.backup" ]; then
  rm -rf backend/device-service/dist
  mv backend/device-service/dist.backup backend/device-service/dist
  pm2 restart device-service
fi
```

---

## 📝 执行日志

在执行过程中,记录每个步骤:

```bash
# 创建执行日志文件
EXEC_LOG="/home/eric/next-cloudphone/SYSTEM_FIX_EXECUTION_LOG.md"

# 记录开始
echo "# 系统修复执行日志" > $EXEC_LOG
echo "开始时间: $(date)" >> $EXEC_LOG
echo "" >> $EXEC_LOG

# 每个任务完成后记录
echo "## Phase 1 - Task 1.1 完成" >> $EXEC_LOG
echo "时间: $(date)" >> $EXEC_LOG
echo "结果: 成功/失败" >> $EXEC_LOG
echo "备注: ..." >> $EXEC_LOG
echo "" >> $EXEC_LOG
```

---

## 🎯 下一步行动

完成所有修复后:

1. **提交代码**:
```bash
git add .
git commit -m "fix: resolve all system issues - Docker, ADB, TypeScript errors"
git push origin fix/device-service-typescript-errors
```

2. **创建PR**:
   - 标题: "Fix: System Issues - Docker/ADB/TypeScript"
   - 描述: 包含修复的所有问题列表
   - 关联诊断报告

3. **更新文档**:
   - 更新TROUBLESHOOTING.md
   - 记录常见问题和解决方案

4. **团队通知**:
   - 通知团队系统已修复
   - 分享诊断和修复文档

---

**计划结束**

*准备好开始执行了吗?建议按Phase顺序执行,每完成一个Phase进行验证。*
