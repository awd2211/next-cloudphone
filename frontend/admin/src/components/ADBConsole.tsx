import { useState, useRef, useEffect } from 'react';
import { Input, Button, Space, message } from 'antd';
import { SendOutlined, ClearOutlined } from '@ant-design/icons';
import { executeShellCommand } from '@/services/device';

interface ADBConsoleProps {
  deviceId: string;
}

interface ConsoleMessage {
  type: 'input' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

const ADBConsole = ({ deviceId }: ADBConsoleProps) => {
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 滚动到底部
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);

  const handleExecute = async () => {
    if (!command.trim()) return;

    const inputMessage: ConsoleMessage = {
      type: 'input',
      content: command,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, inputMessage]);
    setLoading(true);

    try {
      const result = await executeShellCommand(deviceId, { command });
      const outputMessage: ConsoleMessage = {
        type: 'output',
        content: result.output || '(无输出)',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, outputMessage]);
      setCommand('');
    } catch (error: any) {
      const errorMessage: ConsoleMessage = {
        type: 'error',
        content: error.response?.data?.message || '命令执行失败',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      message.error('命令执行失败');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecute();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const getCommonCommands = () => [
    { label: '查看设备信息', command: 'getprop' },
    { label: '列出应用', command: 'pm list packages' },
    { label: '查看系统日志', command: 'logcat -d -t 50' },
    { label: '查看内存使用', command: 'dumpsys meminfo' },
    { label: '查看 CPU 信息', command: 'cat /proc/cpuinfo' },
    { label: '查看存储', command: 'df -h' },
    { label: '列出文件', command: 'ls -la /sdcard' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontWeight: 'bold' }}>常用命令：</span>
          {getCommonCommands().map((item, index) => (
            <Button
              key={index}
              size="small"
              onClick={() => setCommand(item.command)}
            >
              {item.label}
            </Button>
          ))}
        </Space>
      </div>

      <div
        ref={consoleRef}
        style={{
          height: 400,
          backgroundColor: '#1e1e1e',
          color: '#d4d4d4',
          padding: 16,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: 14,
          lineHeight: 1.6,
          overflowY: 'auto',
          borderRadius: 4,
          marginBottom: 16,
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#666' }}>
            欢迎使用 ADB 控制台。输入命令并按回车执行。
          </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: 8 }}>
            <span style={{ color: '#666', marginRight: 8 }}>
              [{formatTimestamp(msg.timestamp)}]
            </span>
            {msg.type === 'input' && (
              <span>
                <span style={{ color: '#4ec9b0' }}>$ </span>
                <span style={{ color: '#ce9178' }}>{msg.content}</span>
              </span>
            )}
            {msg.type === 'output' && (
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  color: '#d4d4d4',
                }}
              >
                {msg.content}
              </pre>
            )}
            {msg.type === 'error' && (
              <span style={{ color: '#f48771' }}>{msg.content}</span>
            )}
          </div>
        ))}
      </div>

      <Space.Compact style={{ width: '100%' }}>
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入 ADB shell 命令..."
          disabled={loading}
          prefix={<span style={{ color: '#999' }}>adb shell</span>}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleExecute}
          loading={loading}
        >
          执行
        </Button>
        <Button icon={<ClearOutlined />} onClick={handleClear}>
          清空
        </Button>
      </Space.Compact>

      <div style={{ marginTop: 16, color: '#666', fontSize: 12 }}>
        <p style={{ margin: 0 }}>提示：</p>
        <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
          <li>命令会在设备上以 adb shell 方式执行</li>
          <li>按回车键快速执行命令</li>
          <li>可以使用上方的常用命令快捷按钮</li>
        </ul>
      </div>
    </div>
  );
};

export default ADBConsole;
