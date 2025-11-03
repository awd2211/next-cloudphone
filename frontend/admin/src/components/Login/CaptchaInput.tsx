import { Row, Col, Input } from 'antd';
import { SafetyOutlined, ReloadOutlined } from '@ant-design/icons';
import { memo } from 'react';

interface CaptchaInputProps {
  captchaSvg: string;
  captchaLoading: boolean;
  onRefresh: () => void;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * 验证码输入组件
 * 包含验证码输入框和 SVG 验证码图片
 */
export const CaptchaInput = memo<CaptchaInputProps>(
  ({ captchaSvg, captchaLoading, onRefresh, value, onChange }) => {
    return (
      <Row gutter={8}>
        <Col span={14}>
          <Input
            prefix={<SafetyOutlined />}
            placeholder="验证码"
            maxLength={4}
            autoComplete="off"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
        </Col>
        <Col span={10}>
          <div
            className="captcha-wrapper"
            onClick={onRefresh}
            style={{
              height: 40,
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f5f5f5',
              position: 'relative',
            }}
          >
            {captchaLoading ? (
              <ReloadOutlined spin style={{ fontSize: 20, color: '#1890ff' }} />
            ) : (
              <div dangerouslySetInnerHTML={{ __html: captchaSvg }} />
            )}
          </div>
        </Col>
      </Row>
    );
  }
);

CaptchaInput.displayName = 'CaptchaInput';
