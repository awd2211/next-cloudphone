import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QueryProvider } from './lib/react-query';
import { validateEnv } from './utils/env';

// 验证环境变量
validateEnv();

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ConfigProvider locale={zhCN}>
          <WebSocketProvider>
            <RouterProvider router={router} />
          </WebSocketProvider>
        </ConfigProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
