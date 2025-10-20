import { Module } from '@nestjs/common';
import { NotificationGateway } from './websocket.gateway';

@Module({
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class WebsocketModule {}
