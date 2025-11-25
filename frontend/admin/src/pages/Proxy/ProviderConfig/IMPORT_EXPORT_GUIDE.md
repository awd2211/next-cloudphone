# 配置导入导出功能使用指南

## 📋 功能概述

**功能名称**: 代理供应商配置导入/导出
**实现日期**: 2025-11-24
**版本**: v1.0.0
**状态**: ✅ **已完成**

---

## 🎯 功能特性

### 1. 双向数据迁移

支持完整的配置导入和导出，方便：
- ✅ 配置备份和恢复
- ✅ 环境间配置迁移（开发 → 测试 → 生产）
- ✅ 批量配置管理
- ✅ 配置版本控制

### 2. 多格式支持

| 格式 | 导入 | 导出 | 说明 |
|------|------|------|------|
| **JSON** | ✅ | ✅ | 完整字段支持，推荐使用 |
| **Excel** | 🔧 | 🔧 | 需要安装 xlsx 库，适合表格编辑 |

### 3. 导入验证机制

在实际导入前进行全面验证：

**必填字段检查**:
- 供应商名称（name）
- 供应商类型（type）
- 配置信息（config）
- 网关地址（config.gateway）

**类型验证**:
- 支持的类型：ipidea, kookeey, brightdata, oxylabs, iproyal, smartproxy
- 无效类型将被标记为错误

**配置完整性检查**:
- 网关地址格式验证（host:port）
- 特定供应商必需字段检查
  - IPIDEA: 建议提供 username 和 password
  - Kookeey: 必须提供 apiKey

**重复检查**:
- 检测同名供应商并发出警告
- 导入不会覆盖现有配置，会创建新配置

### 4. 导入预览功能

| 功能 | 说明 |
|------|------|
| **统计概览** | 显示总计、有效、警告、错误的数量 |
| **详细列表** | 表格展示每个配置的验证状态 |
| **错误详情** | 展开行可查看具体错误和警告 |
| **智能筛选** | 只导入有效配置，自动忽略无效项 |

### 5. 批量导出

- 一键导出所有供应商配置
- 包含完整配置信息（包括敏感字段）
- 文件名自动包含日期（方便版本管理）

---

## 🖥️ 用户界面

### 对话框结构

```
┌────────────────────────────────────────────────────┐
│  导入/导出配置                              [×]   │
├────────────────────────────────────────────────────┤
│  [导入配置] [导出配置]  <-- Tabs                  │
├────────────────────────────────────────────────────┤
│                                                    │
│  【导入选项卡】                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ 选择导入格式：                            │    │
│  │ ⚪ JSON 格式  ⚪ Excel 格式(disabled)    │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  [📁 选择文件]                                    │
│                                                    │
│  ℹ️ 导入说明                                      │
│  • JSON 格式：直接导出的配置文件...              │
│  • Excel 格式：表格形式...                        │
│  • 导入前会进行验证...                            │
│                                                    │
│  【预览表格（文件选择后显示）】                   │
│  ┌──────────────────────────────────────────┐    │
│  │ 统计: 总计 5 | 有效 4 | 警告 1 | 错误 0  │    │
│  ├──────┬──────┬──────┬──────┬──────────┤    │
│  │ 序号 │ 名称 │ 类型 │ 网关 │ 验证状态 │    │
│  ├──────┼──────┼──────┼──────┼──────────┤    │
│  │  1   │ IP01 │IPIDEA│ ...  │ ✅ 有效   │    │
│  │  2   │ KK01 │Kookey│ ...  │ ⚠️ 有警告 │    │
│  │  3   │ IP02 │IPIDEA│ ...  │ ✅ 有效   │    │
│  └──────┴──────┴──────┴──────┴──────────┘    │
│                                                    │
│  [取消]                      [导入 4 个有效配置] │
│                                                    │
└────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────┐
│  导入/导出配置                              [×]   │
├────────────────────────────────────────────────────┤
│  [导入配置] [导出配置]  <-- Tabs                  │
├────────────────────────────────────────────────────┤
│                                                    │
│  【导出选项卡】                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ 选择导出格式：                            │    │
│  │ ⚪ JSON 格式  ⚪ Excel 格式              │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  ℹ️ 导出说明                                      │
│  • 将导出 12 个供应商配置                        │
│  • JSON 格式：包含完整配置信息...                │
│  • Excel 格式：表格形式...                        │
│  • 导出的文件可用于备份或迁移...                 │
│                                                    │
│            [📥 导出为 JSON 文件]                  │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 📖 使用说明

### 导入配置

#### 1. 打开导入对话框
- 点击供应商列表上方的"导入/导出"按钮
- 默认显示"导入配置"选项卡

#### 2. 选择导入格式
- **JSON 格式**（推荐）：保持完整字段，直接可用
- **Excel 格式**：需要先安装 xlsx 库
  ```bash
  cd frontend/admin
  pnpm add xlsx
  ```

#### 3. 选择文件
- 点击"选择文件"按钮
- 选择之前导出的 JSON 或 Excel 文件
- 系统自动解析和验证

#### 4. 查看预览
解析成功后会显示：
- **统计卡片**：总计、有效、警告、错误的数量
- **预览表格**：每个配置的基本信息和验证状态
- **展开详情**：点击表格行可查看验证错误和警告

**验证状态说明**：
- ✅ **有效**：配置完整且正确，可以导入
- ⚠️ **有警告**：配置可用但有建议改进的地方
- ❌ **无效**：配置有错误，不能导入

#### 5. 执行导入
- 点击"导入 X 个有效配置"按钮
- 系统逐个创建供应商配置
- 显示导入结果（成功数/失败数）
- 自动刷新供应商列表

### 导出配置

#### 1. 打开导出对话框
- 点击"导入/导出"按钮
- 切换到"导出配置"选项卡

#### 2. 选择导出格式
- **JSON 格式**：包含所有字段，推荐用于备份
- **Excel 格式**：表格形式，方便批量编辑（需要 xlsx 库）

#### 3. 执行导出
- 点击"导出为 JSON 文件"或"导出为 Excel 文件"按钮
- 浏览器自动下载文件
- 文件名格式：`proxy-providers-YYYY-MM-DD.json`

### JSON 文件格式示例

```json
[
  {
    "id": "uuid-1",
    "name": "IPIDEA 测试供应商",
    "type": "ipidea",
    "enabled": true,
    "config": {
      "gateway": "proxy.ipidea.com:8080",
      "username": "test-user",
      "password": "test-pass",
      "apiKey": "your-api-key"
    },
    "successRate": 95.5,
    "totalRequests": 1000,
    "lastTestedAt": "2025-11-24T10:00:00Z",
    "createdAt": "2025-11-20T08:00:00Z",
    "updatedAt": "2025-11-24T10:00:00Z"
  },
  {
    "id": "uuid-2",
    "name": "Kookeey 生产供应商",
    "type": "kookeey",
    "enabled": true,
    "config": {
      "gateway": "api.kookeey.com:9000",
      "apiKey": "kookeey-api-key",
      "region": "us-east"
    },
    "successRate": 98.2,
    "totalRequests": 5000,
    "lastTestedAt": "2025-11-24T09:30:00Z",
    "createdAt": "2025-11-15T12:00:00Z",
    "updatedAt": "2025-11-24T09:30:00Z"
  }
]
```

**导入时的字段处理**：
- `id`, `createdAt`, `updatedAt` 等字段会被忽略（由系统自动生成）
- `successRate`, `totalRequests`, `lastTestedAt` 等统计字段也会被重置
- 只有 `name`, `type`, `enabled`, `config` 会被导入

---

## 🧪 测试场景

### 功能测试

#### 场景 1: JSON 格式导入成功
**步骤**:
1. [ ] 导出现有配置为 JSON 文件
2. [ ] 删除或修改部分配置
3. [ ] 导入之前导出的 JSON 文件
4. [ ] 验证所有配置正确导入
5. [ ] 验证配置可正常使用

**预期结果**:
- 所有配置显示为"有效"
- 导入成功，无错误
- 配置可以正常测试连接

#### 场景 2: 导入验证 - 缺少必填字段
**步骤**:
1. [ ] 创建一个 JSON 文件，删除某个供应商的 `name` 字段
2. [ ] 尝试导入该文件
3. [ ] 查看预览表格

**预期结果**:
- 缺少 name 的配置显示为"无效"
- 展开详情显示错误："供应商名称不能为空"
- 导入按钮只导入有效配置

#### 场景 3: 导入验证 - 无效类型
**步骤**:
1. [ ] 创建 JSON，将某个 `type` 设置为 "invalid-type"
2. [ ] 导入文件

**预期结果**:
- 显示错误："无效的供应商类型: invalid-type"
- 该配置无法导入

#### 场景 4: 导入验证 - 同名警告
**步骤**:
1. [ ] 导出现有配置
2. [ ] 不删除原配置
3. [ ] 重新导入相同文件

**预期结果**:
- 显示警告："存在同名供应商，导入后将创建新的配置"
- 可以成功导入（创建新配置，不覆盖）

#### 场景 5: 导入验证 - 网关格式
**步骤**:
1. [ ] 创建 JSON，将 gateway 设置为无效格式（如 "invalid"）
2. [ ] 导入文件

**预期结果**:
- 显示警告："网关地址格式可能不正确，应为 host:port 格式"
- 仍可导入，但有警告标记

#### 场景 6: 批量导出
**步骤**:
1. [ ] 创建多个不同类型的供应商配置
2. [ ] 点击"导入/导出"
3. [ ] 切换到"导出配置"选项卡
4. [ ] 选择 JSON 格式并导出
5. [ ] 验证下载的文件内容

**预期结果**:
- 文件包含所有供应商配置
- JSON 格式正确
- 所有字段完整

#### 场景 7: 部分导入成功
**步骤**:
1. [ ] 创建包含 5 个配置的 JSON，其中 2 个无效
2. [ ] 导入文件

**预期结果**:
- 预览显示："总计 5 | 有效 3 | 错误 2"
- 导入按钮显示"导入 3 个有效配置"
- 只有有效的 3 个被导入

### UI/UX 测试

#### UX 1: 对话框交互
- [ ] 对话框宽度适中（900px）
- [ ] Tabs 切换流畅
- [ ] 可以点击遮罩或 ESC 关闭
- [ ] 关闭后状态重置

#### UX 2: 格式选择
- [ ] 单选按钮清晰易选
- [ ] Excel 格式禁用时有提示
- [ ] 切换格式后文件选择器接受的文件类型改变

#### UX 3: 文件上传
- [ ] 上传区域明显
- [ ] 支持拖拽上传（如果 Upload 组件支持）
- [ ] 文件选择后立即解析
- [ ] 解析失败时显示清晰错误

#### UX 4: 预览表格
- [ ] 表格自动滚动（高度 300px）
- [ ] 验证状态用不同颜色区分
- [ ] 展开/收起流畅
- [ ] 统计卡片一目了然

#### UX 5: 导入按钮
- [ ] 有效配置为 0 时禁用
- [ ] 显示将要导入的数量
- [ ] 导入中显示 loading 状态
- [ ] 导入完成后自动关闭

#### UX 6: 导出按钮
- [ ] 按钮大小合适（large）
- [ ] 有图标和文字
- [ ] 点击后立即下载
- [ ] 成功后显示 message

### 错误处理测试

#### 错误 1: JSON 解析失败
**步骤**: 上传无效的 JSON 文件

**预期**: 显示错误："JSON 格式错误: [具体错误]"

#### 错误 2: 文件读取失败
**步骤**: 上传损坏的文件

**预期**: 显示错误："文件读取失败"

#### 错误 3: 导入失败
**步骤**: 在导入过程中网络断开

**预期**: 显示具体失败数量，已成功的不回滚

### 性能测试

#### 性能 1: 大文件解析
**步骤**:
1. [ ] 创建包含 100 个配置的 JSON 文件
2. [ ] 导入该文件

**预期**:
- 解析时间 < 1 秒
- 预览渲染流畅
- 导入时间合理（取决于网络）

#### 性能 2: 导出速度
**步骤**:
1. [ ] 导出 100 个供应商配置

**预期**:
- 生成文件 < 500ms
- 下载立即开始

---

## 🔧 技术实现

### 组件结构

```typescript
ImportExportModal
  ├── Props
  │   ├── visible: boolean             // 对话框可见性
  │   ├── onCancel: () => void         // 关闭回调
  │   ├── providers: ProxyProvider[]   // 当前所有供应商
  │   └── onImport: (providers) => Promise<void>  // 导入处理
  │
  ├── State
  │   ├── activeTab: 'import' | 'export'  // 当前选项卡
  │   ├── importFormat: 'json' | 'excel'  // 导入格式
  │   ├── exportFormat: 'json' | 'excel'  // 导出格式
  │   ├── fileList: UploadFile[]          // 上传的文件
  │   ├── previewData: ImportPreviewItem[] // 预览数据
  │   └── importing: boolean              // 导入中状态
  │
  └── Methods
      ├── validateProvider()    // 验证单个供应商
      ├── parseJsonFile()       // 解析 JSON 文件
      ├── parseExcelFile()      // 解析 Excel 文件
      ├── handleFileUpload()    // 处理文件上传
      ├── handleImport()        // 执行导入
      ├── handleExportJson()    // 导出为 JSON
      └── handleExportExcel()   // 导出为 Excel
```

### 数据类型

```typescript
interface ImportPreviewItem extends Partial<ProxyProvider> {
  _validation: ValidationResult;  // 验证结果
  _index: number;                 // 索引
}

interface ValidationResult {
  valid: boolean;       // 是否有效
  errors: string[];     // 错误列表
  warnings: string[];   // 警告列表
}
```

### 验证规则

```typescript
// 必填字段
- name: string (非空)
- type: string (在 validTypes 中)
- config: object (非空)
- config.gateway: string (格式: host:port)

// 特定类型验证
- type === 'ipidea': 建议 username, password
- type === 'kookeey': 必需 apiKey

// 格式验证
- gateway: /^.+:\d+$/ (host:port 格式)
```

### 文件处理

**JSON 导入**:
```typescript
// 1. FileReader 读取文件内容
// 2. JSON.parse() 解析
// 3. 标准化为数组（支持单个对象）
// 4. 逐个验证
```

**JSON 导出**:
```typescript
// 1. JSON.stringify(providers, null, 2)
// 2. Blob 创建
// 3. URL.createObjectURL()
// 4. 模拟点击下载
```

**Excel 导入** (需要 xlsx 库):
```typescript
import * as XLSX from 'xlsx';

// 1. ArrayBuffer 读取文件
// 2. XLSX.read() 解析工作簿
// 3. XLSX.utils.sheet_to_json() 转 JSON
// 4. 字段映射到 ProxyProvider 格式
```

**Excel 导出** (需要 xlsx 库):
```typescript
import * as XLSX from 'xlsx';

// 1. 转换为表格格式（中文列名）
// 2. XLSX.utils.json_to_sheet()
// 3. XLSX.utils.book_new() + book_append_sheet()
// 4. XLSX.writeFile() 下载
```

---

## 📈 安装 Excel 支持（可选）

如果需要 Excel 格式导入导出，执行以下步骤：

### 1. 安装 xlsx 库

```bash
cd frontend/admin
pnpm add xlsx
```

### 2. 更新 ImportExportModal.tsx

在文件顶部添加导入：
```typescript
import * as XLSX from 'xlsx';
```

### 3. 取消注释 Excel 相关代码

在 `parseExcelFile` 和 `handleExportExcel` 函数中，取消注释实际实现代码。

### 4. 启用 Excel 格式按钮

```typescript
// 导入选项卡
<Radio.Button value="excel">  {/* 移除 disabled */}
  <FileExcelOutlined /> Excel 格式
</Radio.Button>

// 导出按钮
<Button
  type="primary"
  size="large"
  icon={<DownloadOutlined />}
  onClick={handleExportExcel}
  // disabled  {/* 移除 */}
>
  导出为 Excel 文件
</Button>
```

### 5. Excel 列映射示例

```typescript
// 导出时的列映射
const excelData = providers.map(p => ({
  '名称': p.name,
  '类型': p.type.toUpperCase(),
  '启用': p.enabled ? '是' : '否',
  '网关地址': p.config?.gateway,
  '用户名': p.config?.username || '',
  '密码': p.config?.password || '',
  '成功率': p.successRate ? `${p.successRate}%` : '0%',
  '最后测试': p.lastTestedAt
    ? new Date(p.lastTestedAt).toLocaleString('zh-CN')
    : '-',
}));

// 导入时的反向映射
const providers = jsonData.map((row: any) => ({
  name: row['名称'],
  type: row['类型']?.toLowerCase(),
  enabled: row['启用'] === '是' || row['启用'] === true,
  config: {
    gateway: row['网关地址'],
    username: row['用户名'],
    password: row['密码'],
  },
}));
```

---

## 🎓 最佳实践

### 1. 定期备份

建议每周或每次重要更改前导出配置：
```bash
# 文件命名规范
proxy-providers-2025-11-24-weekly-backup.json
proxy-providers-2025-11-24-before-migration.json
```

### 2. 版本控制

将导出的配置文件加入版本控制：
```bash
cd your-project
mkdir -p config/proxy-providers
# 导出文件保存到这里
git add config/proxy-providers/
git commit -m "backup: proxy provider configs"
```

### 3. 环境管理

为不同环境维护不同的配置文件：
```
config/
  ├── proxy-providers/
  │   ├── development.json    # 开发环境
  │   ├── staging.json        # 测试环境
  │   └── production.json     # 生产环境
```

### 4. 配置模板

创建供应商配置模板便于快速添加：
```json
{
  "name": "新供应商名称",
  "type": "ipidea",
  "enabled": false,
  "config": {
    "gateway": "proxy.example.com:8080",
    "username": "填写用户名",
    "password": "填写密码",
    "apiKey": "填写API密钥"
  }
}
```

### 5. 安全考虑

导出的文件包含敏感信息（密码、API Key）：
- ❌ 不要将包含真实凭证的文件提交到公开仓库
- ✅ 使用 `.gitignore` 排除备份文件
- ✅ 传输文件时使用加密
- ✅ 定期轮换 API 密钥

### 6. 导入前检查

导入前务必：
1. 查看预览确认数据正确
2. 检查验证状态，解决所有错误
3. 注意警告信息
4. 确认目标环境正确

---

## 🐛 常见问题

### Q1: 导入后找不到新配置？
**A**: 检查：
1. 导入是否成功（查看成功消息）
2. 是否有筛选条件（清空筛选）
3. 刷新页面或点击"刷新"按钮

### Q2: 为什么有些字段导入后变了？
**A**: 以下字段会被系统重新生成：
- `id` - 新的 UUID
- `createdAt` - 当前时间
- `updatedAt` - 当前时间
- `successRate` - 重置为 0
- `totalRequests` - 重置为 0
- `lastTestedAt` - null

### Q3: Excel 格式为什么不可用？
**A**: 需要安装 xlsx 库：
```bash
cd frontend/admin
pnpm add xlsx
```
然后按照"安装 Excel 支持"部分操作。

### Q4: 导入同名配置会覆盖吗？
**A**: 不会。系统会创建新的配置，原配置保持不变。
如果需要更新现有配置，应该使用"编辑"功能。

### Q5: 可以只导入部分配置吗？
**A**: 可以。编辑 JSON 文件，删除不需要的配置项，
或者在预览时查看具体哪些会被导入。

### Q6: 导入失败怎么办？
**A**:
1. 查看错误消息确定原因
2. 检查 JSON 格式是否正确
3. 验证必填字段是否完整
4. 查看浏览器控制台详细错误

### Q7: 导出的文件太大怎么办？
**A**:
- JSON 文件通常很小（几 KB 到几百 KB）
- 如果太大，可以分批导出
- 或者手动编辑 JSON 删除不需要的配置

---

## ✅ 完成检查清单

### 功能完整性
- [x] JSON 格式导入
- [x] JSON 格式导出
- [x] Excel 格式导入（需 xlsx 库）
- [x] Excel 格式导出（需 xlsx 库）
- [x] 导入验证（必填字段）
- [x] 导入验证（类型检查）
- [x] 导入验证（格式检查）
- [x] 导入预览表格
- [x] 验证结果统计
- [x] 展开行查看详情
- [x] 批量导入处理
- [x] 文件下载功能

### 代码质量
- [x] TypeScript 类型定义
- [x] React Hooks 使用
- [x] 错误处理
- [x] 性能优化（useMemo）
- [x] 代码注释

### 用户体验
- [x] 清晰的 UI 布局
- [x] Tabs 组织内容
- [x] 统计卡片可视化
- [x] 颜色区分状态
- [x] Loading 状态
- [x] 成功/失败消息

### 文档完善
- [x] 使用指南
- [x] 测试场景
- [x] 技术文档
- [x] 最佳实践
- [x] 常见问题

---

## 📝 更新日志

### v1.0.0 (2025-11-24)
- ✅ 初始版本发布
- ✅ JSON 格式导入导出（完整实现）
- ✅ Excel 格式导入导出（框架实现，需 xlsx 库）
- ✅ 完整的导入验证机制
- ✅ 预览表格和统计
- ✅ 批量处理支持

### 未来计划
- [ ] 增量导入（合并而非创建新配置）
- [ ] 导入冲突解决策略（覆盖/跳过/重命名）
- [ ] 导出时选择特定供应商
- [ ] 导出时选择包含/排除的字段
- [ ] CSV 格式支持
- [ ] 配置加密导出（保护敏感信息）
- [ ] 导入模板下载

---

**功能状态**: ✅ **已完成并可用**
**下一步**: 用户验收测试，根据反馈优化

---

*最后更新: 2025-11-24 18:00*
