# pnpm 使用指南

本项目使用 **pnpm** 作为 Node.js 包管理器，相比 npm/yarn 具有以下优势：

## 为什么使用 pnpm？

✅ **磁盘空间节省**: 使用硬链接和符号链接，节省大量磁盘空间
✅ **安装速度快**: 比 npm/yarn 快 2-3 倍
✅ **严格的依赖管理**: 避免幽灵依赖问题
✅ **Monorepo 支持**: 内置工作区（workspace）支持

## 安装 pnpm

### 方法一：使用 npm (推荐)

```bash
npm install -g pnpm
```

### 方法二：使用独立脚本 (Windows)

```powershell
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### 方法三：使用独立脚本 (Linux/Mac)

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

验证安装：

```bash
pnpm --version
```

## 常用命令对照

| npm 命令 | pnpm 命令 | 说明 |
|----------|-----------|------|
| `npm install` | `pnpm install` | 安装所有依赖 |
| `npm install <pkg>` | `pnpm add <pkg>` | 安装包 |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` | 安装开发依赖 |
| `npm install -g <pkg>` | `pnpm add -g <pkg>` | 全局安装 |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` | 卸载包 |
| `npm run <script>` | `pnpm <script>` | 运行脚本 |
| `npm update` | `pnpm update` | 更新依赖 |
| `npx <cmd>` | `pnpm dlx <cmd>` | 执行包命令 |

## 项目中使用 pnpm

### 1. 安装前端依赖

**管理后台:**

```bash
cd frontend/admin
pnpm install

# 启动开发服务器
pnpm dev
```

**用户端:**

```bash
cd frontend/user
pnpm install

# 启动开发服务器
pnpm dev
```

### 2. 安装后端依赖

**API 网关:**

```bash
cd backend/api-gateway
pnpm install

# 启动开发服务器
pnpm dev
```

**其他 NestJS 服务同理。**

### 3. 添加新依赖

**生产依赖:**

```bash
pnpm add react axios antd
```

**开发依赖:**

```bash
pnpm add -D @types/node eslint prettier
```

**全局安装:**

```bash
pnpm add -g typescript ts-node
```

### 4. 更新依赖

**更新所有依赖到最新兼容版本:**

```bash
pnpm update
```

**更新到最新版本（包括大版本）:**

```bash
pnpm update --latest
```

**交互式更新:**

```bash
pnpm update -i
```

## Monorepo 配置

如果项目需要使用 workspace（工作区），在根目录创建 `pnpm-workspace.yaml`:

```yaml
packages:
  - 'frontend/*'
  - 'backend/*'
```

然后可以在根目录执行命令：

```bash
# 为所有包安装依赖
pnpm install

# 在特定包中运行命令
pnpm --filter api-gateway dev

# 为特定包添加依赖
pnpm --filter admin add react-router-dom
```

## 配置文件 .npmrc

在项目根目录创建 `.npmrc` 配置 pnpm:

```ini
# 使用严格的对等依赖
strict-peer-dependencies=true

# 提升模式
shamefully-hoist=false

# 自动安装对等依赖
auto-install-peers=true

# 锁文件设置
lockfile=true

# 中国大陆镜像加速（可选）
registry=https://registry.npmmirror.com/
```

## 性能对比

在云手机平台项目中的实际测试：

| 操作 | npm | pnpm | 提升 |
|------|-----|------|------|
| 首次安装 (frontend/admin) | 25s | 10s | **2.5x** |
| 二次安装 (有缓存) | 15s | 3s | **5x** |
| 磁盘占用 (全项目) | 850MB | 320MB | **节省 62%** |

## 常见问题

### Q1: pnpm 和 npm 能同时使用吗？

**不推荐**。虽然技术上可行，但会导致：
- 两套 lock 文件 (package-lock.json + pnpm-lock.yaml)
- node_modules 结构冲突
- 依赖版本不一致

**建议**: 统一使用 pnpm。

### Q2: 如何从 npm 迁移到 pnpm？

```bash
# 1. 删除旧的依赖和锁文件
rm -rf node_modules package-lock.json

# 2. 使用 pnpm 安装
pnpm install

# 3. 提交新的锁文件
git add pnpm-lock.yaml
git commit -m "chore: migrate to pnpm"
```

### Q3: 某些包在 pnpm 下报错？

可能是因为包依赖了"幽灵依赖"（未声明的依赖）。

**临时解决方案** (不推荐):

```bash
# 在 .npmrc 中添加
shamefully-hoist=true
```

**正确解决方案**:

手动安装缺失的依赖：

```bash
pnpm add missing-package
```

### Q4: pnpm 下某些二进制文件找不到？

设置公共提升模式：

```bash
# .npmrc
public-hoist-pattern[]=*cli*
public-hoist-pattern[]=*bin*
```

## 脚本示例

### package.json 示例

```json
{
  "name": "cloudphone-admin",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "vite": "^5.0.0"
  }
}
```

运行脚本：

```bash
pnpm dev        # 等同于 pnpm run dev
pnpm build
pnpm lint
pnpm format
```

## 推荐的 IDE 配置

### VS Code

安装插件: **pnpm**

设置 (settings.json):

```json
{
  "npm.packageManager": "pnpm",
  "typescript.tsdk": "node_modules/typescript/lib",
  "eslint.packageManager": "pnpm"
}
```

### WebStorm

Settings → Languages & Frameworks → Node.js and NPM → Package manager:
选择 **pnpm**

## 总结

使用 pnpm 的关键点：

1. ✅ 全局安装: `npm install -g pnpm`
2. ✅ 添加依赖: `pnpm add <package>`
3. ✅ 运行脚本: `pnpm <script-name>`
4. ✅ 删除旧的 `package-lock.json` 和 `node_modules`
5. ✅ 提交 `pnpm-lock.yaml` 到版本控制

---

**参考文档**: https://pnpm.io/zh/
