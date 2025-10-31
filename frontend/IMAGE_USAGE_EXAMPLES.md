# 图片资源使用示例

## 📚 目录
- [Logo 使用](#logo-使用)
- [功能图标](#功能图标)
- [空状态插图](#空状态插图)
- [错误页面](#错误页面)
- [性能优化](#性能优化)

## Logo 使用

### 在导航栏中使用
```tsx
// 浅色背景
<img
  src="/images/brand/logo.svg"
  alt="云手机平台"
  style={{ height: 40 }}
/>

// 深色背景
<img
  src="/images/brand/logo-white.svg"
  alt="云手机平台"
  style={{ height: 40 }}
/>
```

### 在登录页面使用
```tsx
// frontend/admin/src/pages/Login/index.tsx
<div style={{ textAlign: 'center', marginBottom: 24 }}>
  <img
    src="/images/brand/logo.svg"
    alt="云手机平台"
    style={{ height: 60, marginBottom: 16 }}
  />
  <h1>云手机平台 - 管理后台</h1>
</div>
```

## 功能图标

### 替换 Home 页面的 Emoji

**原代码 (使用 emoji):**
```tsx
<div style={{
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: '#e6f7ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 24px',
  fontSize: 40,
}}>
  🚀
</div>
```

**新代码 (使用 SVG):**
```tsx
<div style={{
  width: 80,
  height: 80,
  borderRadius: '50%',
  background: '#e6f7ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto 24px',
}}>
  <img
    src="/images/icons/feature-performance.svg"
    alt="高性能"
    style={{ width: 50, height: 50 }}
  />
</div>
```

### 三个功能图标
```tsx
// 高性能
<img src="/images/icons/feature-performance.svg" alt="高性能" style={{ width: 50 }} />

// 安全可靠
<img src="/images/icons/feature-security.svg" alt="安全可靠" style={{ width: 50 }} />

// 价格实惠
<img src="/images/icons/feature-pricing.svg" alt="价格实惠" style={{ width: 50 }} />
```

## 空状态插图

### 设备列表空状态
```tsx
import { Empty, Button } from 'antd';

<Empty
  image="/images/illustrations/empty-device.svg"
  imageStyle={{ height: 200 }}
  description={
    <span style={{ color: '#8C8C8C', fontSize: 14 }}>
      您还没有创建任何设备
    </span>
  }
>
  <Button type="primary" icon={<PlusOutlined />}>
    创建设备
  </Button>
</Empty>
```

### 订单列表空状态
```tsx
<Empty
  image="/images/illustrations/empty-order.svg"
  imageStyle={{ height: 200 }}
  description="暂无订单记录"
>
  <Button type="primary">
    购买套餐
  </Button>
</Empty>
```

### 通知列表空状态
```tsx
<Empty
  image="/images/illustrations/empty-notification.svg"
  imageStyle={{ height: 200 }}
  description="暂无新通知"
/>
```

### 自定义空状态组件
```tsx
// components/EmptyState.tsx
import { Empty, Button } from 'antd';
import type { FC } from 'react';

interface EmptyStateProps {
  type: 'device' | 'order' | 'notification';
  title?: string;
  description?: string;
  action?: {
    text: string;
    onClick: () => void;
  };
}

const imageMap = {
  device: '/images/illustrations/empty-device.svg',
  order: '/images/illustrations/empty-order.svg',
  notification: '/images/illustrations/empty-notification.svg',
};

const EmptyState: FC<EmptyStateProps> = ({ type, title, description, action }) => {
  return (
    <Empty
      image={imageMap[type]}
      imageStyle={{ height: 200 }}
      description={
        <div>
          {title && <div style={{ fontSize: 16, marginBottom: 8 }}>{title}</div>}
          {description && <div style={{ color: '#8C8C8C' }}>{description}</div>}
        </div>
      }
    >
      {action && (
        <Button type="primary" onClick={action.onClick}>
          {action.text}
        </Button>
      )}
    </Empty>
  );
};

export default EmptyState;
```

**使用示例:**
```tsx
<EmptyState
  type="device"
  title="暂无设备"
  description="创建您的第一个云手机吧"
  action={{
    text: '创建设备',
    onClick: () => navigate('/devices/create'),
  }}
/>
```

## 错误页面

### 404 页面
```tsx
// pages/NotFound.tsx
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      <div style={{ textAlign: 'center' }}>
        <img
          src="/images/illustrations/error-404.svg"
          alt="404"
          style={{ maxWidth: 400, marginBottom: 32 }}
        />
        <Button type="primary" size="large" onClick={() => navigate('/')}>
          返回首页
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
```

### 500 错误页面
```tsx
// components/ErrorBoundary.tsx
import { Component, ReactNode } from 'react';
import { Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh'
        }}>
          <div style={{ textAlign: 'center' }}>
            <img
              src="/images/illustrations/error-500.svg"
              alt="500"
              style={{ maxWidth: 400, marginBottom: 32 }}
            />
            <Button
              type="primary"
              size="large"
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

## 性能优化

### 图片懒加载
```tsx
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

// 用于大图背景
<LazyLoadImage
  src="/images/backgrounds/hero-bg.jpg"
  alt="Hero Background"
  effect="blur"
  width="100%"
  height="600px"
  style={{ objectFit: 'cover' }}
/>
```

### SVG 作为组件
```tsx
// 对于频繁使用的图标,可以创建组件
// components/icons/PerformanceIcon.tsx
import type { FC, CSSProperties } from 'react';

interface Props {
  size?: number;
  style?: CSSProperties;
}

const PerformanceIcon: FC<Props> = ({ size = 50, style }) => {
  return (
    <img
      src="/images/icons/feature-performance.svg"
      alt="高性能"
      style={{ width: size, height: size, ...style }}
    />
  );
};

export default PerformanceIcon;
```

### 预加载关键图片
```tsx
// App.tsx 或 main.tsx
useEffect(() => {
  // 预加载 Logo
  const logoImg = new Image();
  logoImg.src = '/images/brand/logo.svg';

  // 预加载功能图标
  const icons = [
    '/images/icons/feature-performance.svg',
    '/images/icons/feature-security.svg',
    '/images/icons/feature-pricing.svg',
  ];

  icons.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}, []);
```

## Ant Design Empty 全局配置

### 设置全局空状态
```tsx
// App.tsx
import { ConfigProvider, Empty } from 'antd';

const customRenderEmpty = (componentName?: string) => {
  if (componentName === 'Table') {
    return (
      <Empty
        image="/images/illustrations/empty-device.svg"
        imageStyle={{ height: 150 }}
        description="暂无数据"
      />
    );
  }
  return <Empty />;
};

function App() {
  return (
    <ConfigProvider renderEmpty={customRenderEmpty}>
      {/* Your app */}
    </ConfigProvider>
  );
}
```

## 图标库集成 (可选)

如果需要更多图标,可以使用 Iconify:

```bash
pnpm add @iconify/react @iconify-icons/mdi
```

```tsx
import { Icon } from '@iconify/react';
import rocketLaunch from '@iconify-icons/mdi/rocket-launch';

<Icon icon={rocketLaunch} width={48} color="#1890FF" />
```

## 响应式图片

```tsx
// 根据屏幕大小调整图片尺寸
import { useMediaQuery } from 'react-responsive';

const FeatureIcon = () => {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const size = isMobile ? 40 : 50;

  return (
    <img
      src="/images/icons/feature-performance.svg"
      alt="高性能"
      style={{ width: size, height: size }}
    />
  );
};
```

## 主题切换

```tsx
// 根据主题切换 Logo
import { theme } from 'antd';

const Header = () => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer === '#141414';

  return (
    <img
      src={isDark ? '/images/brand/logo-white.svg' : '/images/brand/logo.svg'}
      alt="云手机平台"
      style={{ height: 40 }}
    />
  );
};
```

## 图片文件检查清单

### Admin 前端
```bash
frontend/admin/public/images/
├── brand/
│   ├── logo.svg ✅
│   └── logo-white.svg ✅
├── icons/
│   ├── feature-performance.svg ✅
│   ├── feature-security.svg ✅
│   └── feature-pricing.svg ✅
├── illustrations/
│   ├── empty-device.svg ✅
│   ├── empty-order.svg ✅
│   ├── empty-notification.svg ✅
│   ├── error-404.svg ✅
│   └── error-500.svg ✅
└── backgrounds/
    └── (待添加)
```

### User 前端
```bash
frontend/user/public/images/
├── brand/
│   ├── logo.svg ✅
│   └── logo-white.svg ✅
├── icons/
│   ├── feature-performance.svg ✅
│   ├── feature-security.svg ✅
│   └── feature-pricing.svg ✅
├── illustrations/
│   ├── empty-device.svg ✅
│   ├── empty-order.svg ✅
│   ├── empty-notification.svg ✅
│   ├── error-404.svg ✅
│   └── error-500.svg ✅
└── backgrounds/
    └── (待添加)
```

## 下一步

1. **立即可做**: 更新 `Home.tsx` 替换 emoji 为 SVG
2. **创建组件**: EmptyState 通用组件
3. **优化**: 添加图片懒加载
4. **增强**: 创建 Favicon
