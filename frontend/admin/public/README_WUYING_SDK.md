# 阿里云无影 Web SDK 下载说明

## 获取 SDK

由于阿里云无影 Web SDK 有使用限制和隐私政策要求，需要从官方渠道下载：

### 下载地址

访问以下链接下载官方 SDK：
https://wuying.aliyun.com/wuyingWebSdk/docs/intro/download

### 安装步骤

1. 访问上述下载页面
2. 下载 `Web Client SDK`
3. 解压后找到 `WuyingWebSDK.js` 文件
4. 将该文件复制到当前目录（`frontend/admin/public/`）

### 文件结构

下载后的 SDK 包含：
- `WuyingWebSDK.js` - 核心接口文件（需要放在此目录）
- `WuyingWebDemo.html` - 示例代码
- `sdk/ASP/container.html` - iframe 内嵌资源文件

### 备选方案

如果您有阿里云 OSS 访问权限，也可以从以下位置获取：
```
https://ecd-client.oss-cn-shanghai.aliyuncs.com/wuying/cloudphone/sdk/
```

### 隐私政策

下载和使用 SDK 即表示您认可《无影云电脑 SDK 隐私权政策》。
SDK 仅限个人或企业内部使用，未经授权不得转发。

### 验证安装

下载完成后，确保文件存在：
```bash
ls -lh public/WuyingWebSDK.js
```

文件大小应该在几百 KB 左右（不是几百字节）。

### 代码集成

SDK 安装后会在全局暴露 `window.wuyingSdk` 对象，组件会自动检测并使用。

如果未安装 SDK，播放器组件会显示下载提示。
