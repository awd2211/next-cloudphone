import { memo } from 'react';
import { Modal, Space, Alert, Form, Row, Col, InputNumber, Divider, Descriptions } from 'antd';
import type { FormInstance } from 'antd';
import type { BillingRule, BillingRuleTestResult } from '@/types';

interface TestBillingRuleModalProps {
  visible: boolean;
  selectedRule: BillingRule | null;
  testForm: FormInstance;
  testResult: BillingRuleTestResult | null;
  onOk: () => void;
  onCancel: () => void;
}

export const TestBillingRuleModal = memo<TestBillingRuleModalProps>(
  ({ visible, selectedRule, testForm, testResult, onOk, onCancel }) => {
    return (
      <Modal
        title={`测试规则: ${selectedRule?.name}`}
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        width={700}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="输入测试数据以验证计费规则"
            description={`公式: ${selectedRule?.formula}`}
            type="info"
            showIcon
          />

          <Form form={testForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="运行时长 (小时)"
                  name="hours"
                  rules={[{ required: true, message: '请输入时长' }]}
                >
                  <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="CPU核心数"
                  name="cpuCores"
                  rules={[{ required: true, message: '请输入CPU核心数' }]}
                >
                  <InputNumber min={1} max={32} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="内存 (MB)"
                  name="memoryMB"
                  rules={[{ required: true, message: '请输入内存' }]}
                >
                  <InputNumber min={512} step={512} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="存储 (MB)"
                  name="storageMB"
                  rules={[{ required: true, message: '请输入存储' }]}
                >
                  <InputNumber min={1024} step={1024} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form>

          {testResult && (
            <>
              <Divider>测试结果</Divider>
              <Alert message={`计算费用: ¥${testResult.cost.toFixed(2)}`} type="success" showIcon />
              <Descriptions bordered size="small" column={1}>
                {testResult.breakdown.map((item, index) => (
                  <Descriptions.Item key={index} label={item.component}>
                    {item.value} {item.unit}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </>
          )}
        </Space>
      </Modal>
    );
  }
);

TestBillingRuleModal.displayName = 'TestBillingRuleModal';
