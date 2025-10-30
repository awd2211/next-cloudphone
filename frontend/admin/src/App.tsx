import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
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
          <RouterProvider router={router} />
        </ConfigProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
