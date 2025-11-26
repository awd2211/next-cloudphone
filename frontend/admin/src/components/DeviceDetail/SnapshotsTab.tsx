import React from 'react';
import { Card, Button } from 'antd';
import { SnapshotListTable } from '@/components/DeviceSnapshot';
import { SNAPSHOT_TIPS } from './constants';
import { NEUTRAL_LIGHT } from '@/theme';

interface SnapshotsTabProps {
  deviceId: string;
  onCreateSnapshot: () => void;
  onRestore: (snapshotId: string, snapshotName: string) => void;
}

export const SnapshotsTab: React.FC<SnapshotsTabProps> = React.memo(
  ({ deviceId, onCreateSnapshot, onRestore }) => {
    return (
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Button type="primary" onClick={onCreateSnapshot}>
            创建快照
          </Button>
        </div>
        <SnapshotListTable deviceId={deviceId} onRestore={onRestore} />
        <div style={{ marginTop: 16, color: NEUTRAL_LIGHT.text.tertiary }}>
          <p>💡 提示:</p>
          <ul>
            {SNAPSHOT_TIPS.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      </Card>
    );
  }
);

SnapshotsTab.displayName = 'SnapshotsTab';
