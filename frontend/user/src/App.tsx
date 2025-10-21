import { RouterProvider } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './router';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <WebSocketProvider>
          <RouterProvider router={router} />
        </WebSocketProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
