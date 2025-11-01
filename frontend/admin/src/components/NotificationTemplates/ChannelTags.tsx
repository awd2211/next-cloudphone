import { memo } from 'react';
import { Tag } from 'antd';
import { CHANNEL_CONFIG } from './constants';

interface ChannelTagsProps {
  channels: string[];
}

export const ChannelTags = memo<ChannelTagsProps>(({ channels }) => {
  return (
    <>
      {channels.map((channel) => {
        const config = CHANNEL_CONFIG[channel] || { color: 'default', label: channel };
        return (
          <Tag key={channel} color={config.color}>
            {config.label}
          </Tag>
        );
      })}
    </>
  );
});

ChannelTags.displayName = 'ChannelTags';
