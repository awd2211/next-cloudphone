import React from 'react';
import { Row, Col, Input, Form } from 'antd';
import { SafetyOutlined, ReloadOutlined } from '@ant-design/icons';

interface CaptchaInputProps {
  captchaSvg: string;
  captchaLoading: boolean;
  onRefresh: () => void;
}

/**
 * 验证码输入组件
 * 包含输入框和可刷新的验证码图片
 */
export const CaptchaInput: React.FC<CaptchaInputProps> = React.memo(({
  captchaSvg,
  captchaLoading,
  onRefresh,
}) => {
  return (
    <Form.Item
      name="captcha"
      rules={[
        { required: true, message: '请输入验证码' },
        { len: 4, message: '验证码为4位' },
      ]}
    >
      <Row gutter={8}>
        <Col span={14}>
          <Input
            prefix={<SafetyOutlined />}
            placeholder="验证码"
            maxLength={4}
            autoComplete="off"
          />
        </Col>
        <Col span={10}>
          <div
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
    </Form.Item>
  );
});

CaptchaInput.displayName = 'CaptchaInput';
