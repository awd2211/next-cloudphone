/**
 * LifecycleRuleToggle - 生命周期规则启用/禁用开关组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Switch } from 'antd';

interface LifecycleRuleToggleProps {
  ruleId: string;
  enabled: boolean;
  onToggle: (id: string, enabled: boolean) => void;
}

/**
 * LifecycleRuleToggle 组件
 * 提供规则的启用/禁用开关
 */
export const LifecycleRuleToggle = memo<LifecycleRuleToggleProps>(
  ({ ruleId, enabled, onToggle }) => {
    return (
      <Switch
        checked={enabled}
        checkedChildren="启用"
        unCheckedChildren="禁用"
        onChange={(checked) => onToggle(ruleId, checked)}
      />
    );
  }
);

LifecycleRuleToggle.displayName = 'LifecycleRuleToggle';
