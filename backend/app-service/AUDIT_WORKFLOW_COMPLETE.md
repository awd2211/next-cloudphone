# 应用审核工作流功能文档

**实现日期**: 2025-10-22
**优先级**: P1
**状态**: ✅ 已完成

---

## 📋 功能概述

实现了完整的应用审核工作流，支持多角色协作的应用上架管理流程。开发者上传应用后需经过审核人员审核批准才能正式上架使用。

### 核心能力

1. **完整的审核流程**: 提交审核 → 审核中 → 批准/拒绝/要求修改
2. **审核历史追踪**: 记录所有审核操作和审核意见
3. **多种审核结果**: 支持批准、拒绝、要求修改三种审核动作
4. **权限控制**: 区分开发者和审核人员权限
5. **事件通知**: 审核结果通过事件总线发送通知

---

## 🗄️ 数据库设计

### 1. 应用状态枚举扩展

**表**: `applications`
**枚举**: `applications_status_enum`

```sql
CREATE TYPE applications_status_enum AS ENUM (
  'uploading',       -- 上传中（原有）
  'pending_review',  -- 待审核 ✅ 新增
  'approved',        -- 已批准 ✅ 新增
  'rejected',        -- 已拒绝 ✅ 新增
  'available',       -- 可用（原有）
  'unavailable',     -- 不可用（原有）
  'deleted'          -- 已删除（原有）
);
```

### 2. 审核记录表

**表名**: `app_audit_records`

| 字段 | 类型 | 说明 | 索引 |
|------|------|------|------|
| id | uuid | 主键 | PK |
| applicationId | uuid | 关联应用 | FK, Index |
| action | audit_action_enum | 审核动作 | Index |
| status | audit_status_enum | 审核状态 | Index |
| reviewerId | varchar | 审核人员 ID | Index |
| reviewerName | varchar | 审核人员名称 | - |
| comment | text | 审核意见 | - |
| metadata | jsonb | 额外元数据 | - |
| createdAt | timestamp | 创建时间 | Index |

**审核动作枚举** (`audit_action_enum`):
- `submit` - 提交审核
- `approve` - 批准
- `reject` - 拒绝
- `request_changes` - 要求修改

**审核状态枚举** (`audit_status_enum`):
- `pending` - 待审核
- `approved` - 已批准
- `rejected` - 已拒绝
- `changes_requested` - 要求修改

### 3. 索引优化

```sql
-- 应用审核记录查询
CREATE INDEX IDX_audit_records_applicationId ON app_audit_records (applicationId);

-- 审核人员操作查询
CREATE INDEX IDX_audit_records_reviewerId ON app_audit_records (reviewerId);

-- 时间排序复合索引
CREATE INDEX IDX_audit_records_applicationId_createdAt
  ON app_audit_records (applicationId, createdAt DESC);

-- 时间范围查询
CREATE INDEX IDX_audit_records_createdAt ON app_audit_records (createdAt DESC);

-- 动作和状态过滤
CREATE INDEX IDX_audit_records_action ON app_audit_records (action);
CREATE INDEX IDX_audit_records_status ON app_audit_records (status);
```

---

## 🔧 实体定义

### 1. Application 实体

**位置**: `src/entities/application.entity.ts`

```typescript
export enum AppStatus {
  UPLOADING = 'uploading',
  PENDING_REVIEW = 'pending_review',  // ✅ 新增
  APPROVED = 'approved',               // ✅ 新增
  REJECTED = 'rejected',               // ✅ 新增
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  DELETED = 'deleted',
}

@Entity('applications')
export class Application {
  @Column({
    type: 'enum',
    enum: AppStatus,
    default: AppStatus.UPLOADING,
  })
  @Index()
  status: AppStatus;

  // ... 其他字段
}
```

### 2. AppAuditRecord 实体

**位置**: `src/entities/app-audit-record.entity.ts`

```typescript
export enum AuditAction {
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_CHANGES = 'request_changes',
}

export enum AuditStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CHANGES_REQUESTED = 'changes_requested',
}

@Entity('app_audit_records')
@Index(['applicationId', 'createdAt'])
export class AppAuditRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  applicationId: string;

  @ManyToOne(() => Application, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'applicationId' })
  application: Application;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditStatus })
  status: AuditStatus;

  @Column({ nullable: true })
  @Index()
  reviewerId: string;

  @Column({ nullable: true })
  reviewerName: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## 📦 DTO 定义

**位置**: `src/apps/dto/audit-app.dto.ts`

### 1. 批准应用 DTO

```typescript
export class ApproveAppDto {
  @ApiProperty({ description: '审核人员 ID' })
  @IsNotEmpty()
  @IsUUID()
  reviewerId: string;

  @ApiPropertyOptional({ description: '审核意见' })
  @IsOptional()
  @IsString()
  comment?: string;
}
```

### 2. 拒绝应用 DTO

```typescript
export class RejectAppDto {
  @ApiProperty({ description: '审核人员 ID' })
  @IsNotEmpty()
  @IsUUID()
  reviewerId: string;

  @ApiProperty({ description: '拒绝原因' })
  @IsNotEmpty()
  @IsString()
  comment: string;
}
```

### 3. 要求修改 DTO

```typescript
export class RequestChangesDto {
  @ApiProperty({ description: '审核人员 ID' })
  @IsNotEmpty()
  @IsUUID()
  reviewerId: string;

  @ApiProperty({ description: '需要修改的内容' })
  @IsNotEmpty()
  @IsString()
  comment: string;
}
```

### 4. 提交审核 DTO

```typescript
export class SubmitReviewDto {
  @ApiPropertyOptional({ description: '提交说明' })
  @IsOptional()
  @IsString()
  comment?: string;
}
```

### 5. 查询审核记录 DTO

```typescript
export class GetAuditRecordsQueryDto {
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @IsOptional()
  @IsUUID()
  reviewerId?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
```

---

## 🔌 Service 方法

**位置**: `src/apps/apps.service.ts`

### 1. 提交审核

```typescript
async submitForReview(applicationId: string, dto: SubmitReviewDto): Promise<Application>
```

**功能**:
- 检查应用状态（只有 UPLOADING 或 REJECTED 可以提交）
- 更新应用状态为 PENDING_REVIEW
- 创建 SUBMIT 审核记录

**状态转换**:
```
UPLOADING → PENDING_REVIEW
REJECTED  → PENDING_REVIEW
```

### 2. 批准应用

```typescript
async approveApp(applicationId: string, dto: ApproveAppDto): Promise<Application>
```

**功能**:
- 检查应用状态（必须是 PENDING_REVIEW）
- 更新应用状态为 APPROVED
- 创建 APPROVE 审核记录
- 发布 `app.审核.批准` 事件

**状态转换**:
```
PENDING_REVIEW → APPROVED
```

### 3. 拒绝应用

```typescript
async rejectApp(applicationId: string, dto: RejectAppDto): Promise<Application>
```

**功能**:
- 检查应用状态（必须是 PENDING_REVIEW）
- 更新应用状态为 REJECTED
- 创建 REJECT 审核记录（必须包含拒绝原因）
- 发布 `app.审核.拒绝` 事件

**状态转换**:
```
PENDING_REVIEW → REJECTED
```

### 4. 要求修改

```typescript
async requestChanges(applicationId: string, dto: RequestChangesDto): Promise<Application>
```

**功能**:
- 检查应用状态（必须是 PENDING_REVIEW）
- 应用状态保持不变（仍为 PENDING_REVIEW）
- 创建 REQUEST_CHANGES 审核记录
- 开发者需根据意见修改后重新提交

**状态转换**:
```
PENDING_REVIEW → PENDING_REVIEW (不变)
```

### 5. 获取审核记录

```typescript
async getAuditRecords(applicationId: string): Promise<AppAuditRecord[]>
```

**功能**:
- 获取指定应用的所有审核记录
- 按创建时间降序排序

### 6. 获取待审核应用列表

```typescript
async getPendingReviewApps(page: number = 1, limit: number = 10)
```

**功能**:
- 获取所有状态为 PENDING_REVIEW 的应用
- 支持分页
- 按提交时间升序排序（优先处理早提交的）

### 7. 获取所有审核记录

```typescript
async getAllAuditRecords(
  page: number = 1,
  limit: number = 10,
  filters?: {
    applicationId?: string;
    reviewerId?: string;
    action?: AuditAction;
  }
)
```

**功能**:
- 获取所有审核记录
- 支持多条件筛选
- 支持分页
- 关联加载 application 实体

---

## 🌐 API 端点

**Controller**: `src/apps/apps.controller.ts`

### 1. 提交审核

```
POST /apps/:id/submit-review
```

**权限**: `app.create`（开发者）

**请求示例**:
```bash
POST http://localhost:30003/apps/uuid-app-id/submit-review
Authorization: Bearer <token>
Content-Type: application/json

{
  "comment": "已完成修改，请重新审核"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "应用已提交审核",
  "data": {
    "id": "uuid-app-id",
    "name": "My App",
    "status": "pending_review",
    "createdAt": "2025-10-22T10:00:00Z"
  }
}
```

### 2. 批准应用

```
POST /apps/:id/approve
```

**权限**: `app.approve`（审核人员）

**请求示例**:
```bash
POST http://localhost:30003/apps/uuid-app-id/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "reviewerId": "uuid-reviewer-id",
  "comment": "应用符合规范，批准上架"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "应用已批准",
  "data": {
    "id": "uuid-app-id",
    "name": "My App",
    "status": "approved",
    "updatedAt": "2025-10-22T11:00:00Z"
  }
}
```

### 3. 拒绝应用

```
POST /apps/:id/reject
```

**权限**: `app.approve`（审核人员）

**请求示例**:
```bash
POST http://localhost:30003/apps/uuid-app-id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reviewerId": "uuid-reviewer-id",
  "comment": "应用包含违规内容，不符合上架要求"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "应用已拒绝",
  "data": {
    "id": "uuid-app-id",
    "name": "My App",
    "status": "rejected",
    "updatedAt": "2025-10-22T11:00:00Z"
  }
}
```

### 4. 要求修改

```
POST /apps/:id/request-changes
```

**权限**: `app.approve`（审核人员）

**请求示例**:
```bash
POST http://localhost:30003/apps/uuid-app-id/request-changes
Authorization: Bearer <token>
Content-Type: application/json

{
  "reviewerId": "uuid-reviewer-id",
  "comment": "请更新应用描述，补充功能说明和隐私政策"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "已要求开发者修改",
  "data": {
    "id": "uuid-app-id",
    "name": "My App",
    "status": "pending_review",
    "updatedAt": "2025-10-22T11:00:00Z"
  }
}
```

### 5. 获取审核记录

```
GET /apps/:id/audit-records
```

**权限**: `app.read`

**请求示例**:
```bash
GET http://localhost:30003/apps/uuid-app-id/audit-records
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-record-1",
      "applicationId": "uuid-app-id",
      "action": "approve",
      "status": "approved",
      "reviewerId": "uuid-reviewer",
      "reviewerName": "张三",
      "comment": "应用符合规范，批准上架",
      "createdAt": "2025-10-22T11:00:00Z"
    },
    {
      "id": "uuid-record-2",
      "applicationId": "uuid-app-id",
      "action": "submit",
      "status": "pending",
      "comment": "首次提交审核",
      "createdAt": "2025-10-22T10:00:00Z"
    }
  ],
  "total": 2
}
```

### 6. 获取待审核应用列表

```
GET /apps/pending-review/list
```

**权限**: `app.approve`（审核人员）

**请求示例**:
```bash
GET http://localhost:30003/apps/pending-review/list?page=1&limit=10
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-app-1",
      "name": "App A",
      "packageName": "com.example.appa",
      "versionName": "1.0.0",
      "status": "pending_review",
      "createdAt": "2025-10-22T09:00:00Z"
    },
    {
      "id": "uuid-app-2",
      "name": "App B",
      "packageName": "com.example.appb",
      "versionName": "2.1.0",
      "status": "pending_review",
      "createdAt": "2025-10-22T10:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
```

### 7. 获取所有审核记录

```
GET /apps/audit-records/all
```

**权限**: `app.approve`（审核人员）

**查询参数**:
- `page` - 页码（默认 1）
- `limit` - 每页数量（默认 10）
- `applicationId` - 过滤特定应用
- `reviewerId` - 过滤特定审核人员
- `action` - 过滤审核动作（submit/approve/reject/request_changes）

**请求示例**:
```bash
GET http://localhost:30003/apps/audit-records/all?page=1&limit=20&action=approve
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-record-1",
      "applicationId": "uuid-app-1",
      "action": "approve",
      "status": "approved",
      "reviewerId": "uuid-reviewer",
      "reviewerName": "张三",
      "comment": "应用符合规范",
      "createdAt": "2025-10-22T11:00:00Z",
      "application": {
        "id": "uuid-app-1",
        "name": "App A",
        "packageName": "com.example.appa"
      }
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

---

## 🔄 审核流程

### 完整流程图

```
开发者上传 APK
        ↓
   status: UPLOADING
        ↓
开发者提交审核 (submitForReview)
        ↓
   status: PENDING_REVIEW
   创建审核记录 (action: submit, status: pending)
        ↓
    审核人员审核
        ├─────────┬─────────┐
        ↓         ↓         ↓
      批准      拒绝    要求修改
    (approve) (reject) (requestChanges)
        ↓         ↓         ↓
   APPROVED   REJECTED  PENDING_REVIEW (不变)
        ↓         ↓         ↓
  可以安装    重新提交  开发者修改后重新提交
```

### 状态转换规则

| 当前状态 | 可执行操作 | 目标状态 | 权限 |
|---------|-----------|---------|------|
| UPLOADING | submitForReview | PENDING_REVIEW | app.create |
| PENDING_REVIEW | approve | APPROVED | app.approve |
| PENDING_REVIEW | reject | REJECTED | app.approve |
| PENDING_REVIEW | requestChanges | PENDING_REVIEW | app.approve |
| REJECTED | submitForReview | PENDING_REVIEW | app.create |

### 审核记录生命周期

每次审核操作都会创建一条审核记录，追踪完整的审核历史：

1. **提交审核**: action=SUBMIT, status=PENDING
2. **批准**: action=APPROVE, status=APPROVED
3. **拒绝**: action=REJECT, status=REJECTED
4. **要求修改**: action=REQUEST_CHANGES, status=CHANGES_REQUESTED

---

## 🎯 使用场景

### 场景 1: 新应用上架流程

**开发者视角**:

```typescript
// 1. 上传 APK（自动创建应用，状态为 UPLOADING）
const uploadResponse = await fetch('/apps/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${devToken}` },
  body: formData,
});

const { data: app } = await uploadResponse.json();
// app.status === 'uploading'

// 2. 提交审核
await fetch(`/apps/${app.id}/submit-review`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${devToken}`,
  },
  body: JSON.stringify({
    comment: '首次提交，请审核',
  }),
});
// app.status === 'pending_review'

// 3. 等待审核结果（通过通知或轮询）
```

**审核人员视角**:

```typescript
// 1. 获取待审核列表
const response = await fetch('/apps/pending-review/list?page=1&limit=10', {
  headers: { Authorization: `Bearer ${reviewerToken}` },
});

const { data: apps } = await response.json();

// 2. 查看应用详情和审核历史
const app = apps[0];
const historyResponse = await fetch(`/apps/${app.id}/audit-records`, {
  headers: { Authorization: `Bearer ${reviewerToken}` },
});

const { data: history } = await historyResponse.json();

// 3. 做出审核决定
// 3a. 批准
await fetch(`/apps/${app.id}/approve`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${reviewerToken}`,
  },
  body: JSON.stringify({
    reviewerId: reviewerId,
    comment: '应用符合规范，批准上架',
  }),
});

// 3b. 或拒绝
await fetch(`/apps/${app.id}/reject`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${reviewerToken}`,
  },
  body: JSON.stringify({
    reviewerId: reviewerId,
    comment: '应用包含违规内容',
  }),
});

// 3c. 或要求修改
await fetch(`/apps/${app.id}/request-changes`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${reviewerToken}`,
  },
  body: JSON.stringify({
    reviewerId: reviewerId,
    comment: '请更新应用描述，补充隐私政策',
  }),
});
```

### 场景 2: 应用被拒后重新提交

```typescript
// 应用被拒绝后，开发者修复问题并重新提交
await fetch(`/apps/${rejectedApp.id}/submit-review`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${devToken}`,
  },
  body: JSON.stringify({
    comment: '已根据审核意见修复问题，请重新审核',
  }),
});

// rejectedApp.status: REJECTED → PENDING_REVIEW
```

### 场景 3: 审核人员查看审核历史

```typescript
// 查看特定应用的完整审核历史
const response = await fetch(`/apps/${app.id}/audit-records`, {
  headers: { Authorization: `Bearer ${reviewerToken}` },
});

const { data: records } = await response.json();

// records 包含所有审核操作：
// [
//   { action: 'approve', comment: '符合规范', createdAt: '...' },
//   { action: 'request_changes', comment: '需要补充说明', createdAt: '...' },
//   { action: 'submit', comment: '重新提交', createdAt: '...' },
//   { action: 'reject', comment: '包含违规内容', createdAt: '...' },
//   { action: 'submit', comment: '首次提交', createdAt: '...' }
// ]
```

### 场景 4: 管理员统计审核数据

```typescript
// 获取所有审核记录，按审核人员过滤
const response = await fetch(
  `/apps/audit-records/all?reviewerId=${reviewerId}&action=approve`,
  {
    headers: { Authorization: `Bearer ${adminToken}` },
  }
);

const { data: records, total } = await response.json();

// 统计该审核人员批准的应用数量
console.log(`审核人员 ${reviewerId} 批准了 ${total} 个应用`);
```

---

## 🔔 事件通知

### 发布的事件

**事件总线**: `cloudphone.events` (RabbitMQ)

#### 1. 应用批准事件

**路由键**: `app.审核.批准`

**事件数据**:
```json
{
  "appId": "uuid-app-id",
  "packageName": "com.example.app",
  "versionName": "1.0.0",
  "reviewerId": "uuid-reviewer",
  "timestamp": "2025-10-22T11:00:00.000Z"
}
```

**订阅者**:
- `notification-service` - 发送批准通知给开发者
- `billing-service` - 可能触发计费逻辑

#### 2. 应用拒绝事件

**路由键**: `app.审核.拒绝`

**事件数据**:
```json
{
  "appId": "uuid-app-id",
  "packageName": "com.example.app",
  "versionName": "1.0.0",
  "reviewerId": "uuid-reviewer",
  "reason": "应用包含违规内容",
  "timestamp": "2025-10-22T11:00:00.000Z"
}
```

**订阅者**:
- `notification-service` - 发送拒绝通知给开发者

---

## 📊 数据库索引性能

### 索引使用场景

| 查询场景 | 使用的索引 | 性能提升 |
|---------|-----------|---------|
| 获取特定应用的审核记录 | IDX_audit_records_applicationId | O(log n) |
| 按时间顺序获取审核记录 | IDX_audit_records_applicationId_createdAt | O(log n) |
| 查看审核人员的所有操作 | IDX_audit_records_reviewerId | O(log n) |
| 按动作类型过滤（如只看批准） | IDX_audit_records_action | O(log n) |
| 时间范围查询 | IDX_audit_records_createdAt | O(log n) |

### 查询优化示例

```typescript
// ✅ 高效：使用复合索引
await auditRecordsRepository.find({
  where: { applicationId: 'uuid' },
  order: { createdAt: 'DESC' },
  take: 10,
});
// 使用 IDX_audit_records_applicationId_createdAt

// ✅ 高效：使用单列索引
await auditRecordsRepository.find({
  where: { reviewerId: 'uuid' },
});
// 使用 IDX_audit_records_reviewerId
```

---

## ✅ 测试验证

### 1. 数据库验证

```sql
-- 检查应用状态枚举
SELECT unnest(enum_range(NULL::applications_status_enum))::text;
-- 应包含: pending_review, approved, rejected

-- 检查审核记录表结构
\d app_audit_records;

-- 检查索引
\di IDX_audit_records_*;

-- 查看示例数据
SELECT * FROM app_audit_records ORDER BY "createdAt" DESC LIMIT 5;
```

### 2. 编译验证

```bash
cd backend/app-service
pnpm build

# 预期结果: 编译成功，0 errors
```

### 3. 服务健康检查

```bash
curl http://localhost:30003/health

# 预期响应:
# {
#   "status": "ok",
#   "service": "app-service",
#   "dependencies": {
#     "database": { "status": "healthy" }
#   }
# }
```

### 4. 功能测试用例

#### 测试 1: 完整审核流程

```bash
# 1. 上传应用（假设返回 APP_ID）
APP_ID=$(curl -X POST http://localhost:30003/apps/upload \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -F "file=@test.apk" \
  -F "name=Test App" | jq -r '.data.id')

# 2. 提交审核
curl -X POST http://localhost:30003/apps/$APP_ID/submit-review \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "首次提交"}'

# 3. 批准应用
curl -X POST http://localhost:30003/apps/$APP_ID/approve \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewerId": "reviewer-uuid",
    "comment": "应用符合规范"
  }'

# 4. 获取审核记录
curl http://localhost:30003/apps/$APP_ID/audit-records \
  -H "Authorization: Bearer $DEV_TOKEN"

# 预期结果: 返回 2 条记录（submit + approve）
```

#### 测试 2: 拒绝后重新提交

```bash
# 1. 拒绝应用
curl -X POST http://localhost:30003/apps/$APP_ID/reject \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reviewerId": "reviewer-uuid",
    "comment": "包含违规内容"
  }'

# 2. 重新提交
curl -X POST http://localhost:30003/apps/$APP_ID/submit-review \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "已修复问题"}'

# 预期结果: 状态从 rejected 变为 pending_review
```

#### 测试 3: 获取待审核列表

```bash
curl "http://localhost:30003/apps/pending-review/list?page=1&limit=10" \
  -H "Authorization: Bearer $REVIEWER_TOKEN"

# 预期结果: 返回所有 status=pending_review 的应用
```

#### 测试 4: 状态验证

```bash
# 尝试对非待审核状态的应用进行审核（应该失败）
curl -X POST http://localhost:30003/apps/$APPROVED_APP_ID/approve \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reviewerId": "reviewer-uuid"}'

# 预期结果: HTTP 400, "应用当前状态不是待审核状态"
```

---

## 🔒 安全考虑

### 1. 权限控制

- **开发者权限** (`app.create`): 只能提交自己上传的应用
- **审核人员权限** (`app.approve`): 可以审核所有应用
- **管理员权限**: 可以查看所有审核记录

### 2. 状态校验

所有审核操作都严格校验应用当前状态，防止非法状态转换。

### 3. 必填字段

- 拒绝应用必须提供拒绝原因 (`comment` 必填)
- 要求修改必须说明需要修改的内容

### 4. 审核人员追踪

所有审核操作都记录 `reviewerId` 和 `reviewerName`，确保可追溯性。

---

## 📈 后续扩展

### 可能的增强功能

1. **多级审核**: 支持初审、复审等多级审核流程
2. **自动审核**: 基于规则的自动化审核系统
3. **审核时限**: 超时未审核的应用自动提醒
4. **审核工作台**: 专门的审核人员管理界面
5. **审核统计**: 审核效率、通过率等数据分析
6. **审核模板**: 常见拒绝原因的快速选择模板
7. **审核优先级**: 支持加急审核
8. **审核分配**: 自动分配审核任务给审核人员

### 数据库扩展

```sql
-- 未来可能添加的字段
ALTER TABLE app_audit_records
ADD COLUMN "priority" INT DEFAULT 0,         -- 审核优先级
ADD COLUMN "assignedTo" VARCHAR,             -- 分配给的审核人员
ADD COLUMN "estimatedReviewTime" INT,        -- 预计审核时长（分钟）
ADD COLUMN "actualReviewTime" INT,           -- 实际审核时长
ADD COLUMN "reviewDeadline" TIMESTAMP;       -- 审核截止时间
```

---

## 📌 总结

### 实现成果

- ✅ **实体层**: 2 个实体（Application 扩展 + AppAuditRecord 新增）
- ✅ **数据库**: 1 个新表 + 3 个枚举类型 + 6 个索引
- ✅ **DTO 层**: 5 个 DTO 类
- ✅ **Service 层**: 7 个审核相关方法
- ✅ **Controller 层**: 7 个 API 端点
- ✅ **事件通知**: 2 个事件（批准、拒绝）
- ✅ **编译状态**: 0 errors
- ✅ **服务状态**: Healthy
- ✅ **文档**: 完整的功能文档和 API 说明

### 关键特性

1. **完整的审核流程**: 从提交到批准/拒绝的全流程支持
2. **审核历史追溯**: 完整记录所有审核操作
3. **灵活的审核结果**: 支持批准、拒绝、要求修改
4. **权限控制**: 区分开发者和审核人员权限
5. **事件驱动**: 审核结果通过事件总线通知相关服务
6. **高性能查询**: 完善的索引策略
7. **生产就绪**: 完整的错误处理和状态校验

### 已解决的 P1 问题

根据项目规划：
- ✅ P1-1: 添加应用多版本支持（已完成，见 MULTI_VERSION_SUPPORT.md）
- ✅ P1-2: 实现应用审核流程（本文档）

---

## 📖 相关文档

- [应用多版本支持功能文档](./MULTI_VERSION_SUPPORT.md)
- [Application 实体定义](./src/entities/application.entity.ts)
- [审核记录实体定义](./src/entities/app-audit-record.entity.ts)
- [审核 DTO 定义](./src/apps/dto/audit-app.dto.ts)
- [数据库迁移脚本](./migrations/20251022_add_audit_workflow.sql)

---

**文档版本**: 1.0
**最后更新**: 2025-10-22
**维护人**: Claude Code Assistant
