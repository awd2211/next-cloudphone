import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { ScrcpyService } from "./scrcpy.service";
import {
  ScrcpyTouchEvent,
  ScrcpyKeyEvent,
  ScrcpyScrollEvent,
  ScrcpyEventType,
} from "./scrcpy.types";
import {
  ScrcpyControlMessage,
  AndroidMotionEventAction,
  AndroidKeyEventAction,
} from "./scrcpy-protocol";

/**
 * ScrcpyGateway
 *
 * SCRCPY WebSocket 网关
 *
 * 功能：
 * - 转发视频流到前端
 * - 转发音频流到前端
 * - 接收前端控制事件并转发到设备
 * - 管理客户端连接
 *
 * WebSocket 命名空间：
 * - /scrcpy - 主命名空间
 *
 * 事件：
 * - join_session - 加入 SCRCPY 会话
 * - leave_session - 离开会话
 * - touch_event - 触控事件
 * - key_event - 按键事件
 * - scroll_event - 滚动事件
 */
@WebSocketGateway({
  namespace: "scrcpy",
  cors: {
    origin: "*", // 生产环境应该限制具体域名
  },
})
export class ScrcpyGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScrcpyGateway.name);

  /** 客户端连接 Map<socketId, deviceId> */
  private clientSessions: Map<string, string> = new Map();

  /** 设备订阅者 Map<deviceId, Set<socketId>> */
  private deviceSubscribers: Map<string, Set<string>> = new Map();

  constructor(private scrcpyService: ScrcpyService) {}

  /**
   * 客户端连接
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * 客户端断开
   */
  handleDisconnect(client: Socket) {
    const deviceId = this.clientSessions.get(client.id);
    if (deviceId) {
      this.unsubscribeFromDevice(client.id, deviceId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * 加入 SCRCPY 会话
   */
  @SubscribeMessage("join_session")
  handleJoinSession(
    @MessageBody() data: { deviceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { deviceId } = data;

    this.logger.log(`Client ${client.id} joining session for device ${deviceId}`);

    // 检查会话是否存在
    const session = this.scrcpyService.getSession(deviceId);
    if (!session) {
      client.emit("error", {
        message: `No SCRCPY session found for device ${deviceId}`,
      });
      return;
    }

    // 订阅设备
    this.subscribeToDevice(client.id, deviceId);

    // 更新最后活跃时间
    this.scrcpyService.updateLastActive(deviceId);

    // 发送会话信息
    client.emit("session_info", {
      deviceId,
      sessionId: session.sessionId,
      videoUrl: session.videoUrl,
      audioUrl: session.audioUrl,
      controlUrl: session.controlUrl,
      config: session.config,
    });

    this.logger.log(
      `Client ${client.id} joined session for device ${deviceId}`,
    );
  }

  /**
   * 离开 SCRCPY 会话
   */
  @SubscribeMessage("leave_session")
  handleLeaveSession(
    @MessageBody() data: { deviceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { deviceId } = data;
    this.unsubscribeFromDevice(client.id, deviceId);
    this.logger.log(`Client ${client.id} left session for device ${deviceId}`);
  }

  /**
   * 触控事件
   */
  @SubscribeMessage("touch_event")
  handleTouchEvent(
    @MessageBody() event: ScrcpyTouchEvent,
    @ConnectedSocket() client: Socket,
  ) {
    const deviceId = this.clientSessions.get(client.id);
    if (!deviceId) {
      client.emit("error", { message: "Not in a session" });
      return;
    }

    this.logger.debug(
      `Touch event from ${client.id} for device ${deviceId}: ${event.type} (${event.x}, ${event.y})`,
    );

    // 更新最后活跃时间
    this.scrcpyService.updateLastActive(deviceId);

    // 转发触控事件到 SCRCPY 进程
    try {
      const session = this.scrcpyService.getSession(deviceId);
      if (!session) {
        client.emit("error", { message: "Session not found" });
        return;
      }

      const process = this.scrcpyService.getProcess(deviceId);
      if (!process || !process.stdin) {
        client.emit("error", { message: "SCRCPY process not available" });
        return;
      }

      // 映射事件类型到 Android Motion Event Action
      let action: AndroidMotionEventAction;
      switch (event.type) {
        case ScrcpyEventType.TOUCH_DOWN:
          action = AndroidMotionEventAction.DOWN;
          break;
        case ScrcpyEventType.TOUCH_UP:
          action = AndroidMotionEventAction.UP;
          break;
        case ScrcpyEventType.TOUCH_MOVE:
          action = AndroidMotionEventAction.MOVE;
          break;
        default:
          this.logger.warn(`Unknown touch event type: ${event.type}`);
          return;
      }

      // 编码触摸消息
      // 注意：需要传入屏幕尺寸，这里假设从 session config 获取
      const maxSize = session.config.maxSize || 1920;
      const aspectRatio = 16 / 9; // 默认宽高比
      const width = maxSize;
      const height = Math.round(maxSize / aspectRatio);

      const message = ScrcpyControlMessage.encodeTouch({
        action,
        pointerId: event.pointerId || 0,
        x: Math.round(event.x),
        y: Math.round(event.y),
        width,
        height,
        pressure: event.pressure || 1.0,
        buttons: 0,
      });

      // 发送到 SCRCPY stdin
      process.stdin.write(message);

      this.logger.debug(
        `Touch event forwarded to SCRCPY: ${event.type} (${event.x}, ${event.y})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to forward touch event: ${error.message}`,
        error.stack,
      );
      client.emit("error", { message: "Failed to forward touch event" });
    }
  }

  /**
   * 按键事件
   */
  @SubscribeMessage("key_event")
  handleKeyEvent(
    @MessageBody() event: ScrcpyKeyEvent,
    @ConnectedSocket() client: Socket,
  ) {
    const deviceId = this.clientSessions.get(client.id);
    if (!deviceId) {
      client.emit("error", { message: "Not in a session" });
      return;
    }

    this.logger.debug(
      `Key event from ${client.id} for device ${deviceId}: ${event.type} keyCode=${event.keyCode}`,
    );

    // 更新最后活跃时间
    this.scrcpyService.updateLastActive(deviceId);

    // 转发按键事件到 SCRCPY 进程
    try {
      const process = this.scrcpyService.getProcess(deviceId);
      if (!process || !process.stdin) {
        client.emit("error", { message: "SCRCPY process not available" });
        return;
      }

      // 映射事件类型到 Android Key Event Action
      let action: AndroidKeyEventAction;
      switch (event.type) {
        case ScrcpyEventType.KEY_DOWN:
          action = AndroidKeyEventAction.DOWN;
          break;
        case ScrcpyEventType.KEY_UP:
          action = AndroidKeyEventAction.UP;
          break;
        case ScrcpyEventType.BACK:
        case ScrcpyEventType.HOME:
        case ScrcpyEventType.APP_SWITCH:
          // 特殊按键处理
          this.handleSpecialKey(deviceId, event.type, client);
          return;
        default:
          this.logger.warn(`Unknown key event type: ${event.type}`);
          return;
      }

      // 编码按键消息
      const message = ScrcpyControlMessage.encodeKeycode({
        action,
        keycode: event.keyCode,
        repeat: 0,
        metastate: event.metaState || 0,
      });

      // 发送到 SCRCPY stdin
      process.stdin.write(message);

      this.logger.debug(
        `Key event forwarded to SCRCPY: ${event.type} keycode=${event.keyCode}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to forward key event: ${error.message}`,
        error.stack,
      );
      client.emit("error", { message: "Failed to forward key event" });
    }
  }

  /**
   * 滚动事件
   */
  @SubscribeMessage("scroll_event")
  handleScrollEvent(
    @MessageBody() event: ScrcpyScrollEvent,
    @ConnectedSocket() client: Socket,
  ) {
    const deviceId = this.clientSessions.get(client.id);
    if (!deviceId) {
      client.emit("error", { message: "Not in a session" });
      return;
    }

    this.logger.debug(
      `Scroll event from ${client.id} for device ${deviceId}: (${event.x}, ${event.y}) h=${event.hScroll} v=${event.vScroll}`,
    );

    // 更新最后活跃时间
    this.scrcpyService.updateLastActive(deviceId);

    // 转发滚动事件到 SCRCPY 进程
    try {
      const session = this.scrcpyService.getSession(deviceId);
      if (!session) {
        client.emit("error", { message: "Session not found" });
        return;
      }

      const process = this.scrcpyService.getProcess(deviceId);
      if (!process || !process.stdin) {
        client.emit("error", { message: "SCRCPY process not available" });
        return;
      }

      // 获取屏幕尺寸
      const maxSize = session.config.maxSize || 1920;
      const aspectRatio = 16 / 9;
      const width = maxSize;
      const height = Math.round(maxSize / aspectRatio);

      // 编码滚动消息
      const message = ScrcpyControlMessage.encodeScroll({
        x: Math.round(event.x),
        y: Math.round(event.y),
        width,
        height,
        hScroll: Math.round(event.hScroll),
        vScroll: Math.round(event.vScroll),
        buttons: 0,
      });

      // 发送到 SCRCPY stdin
      process.stdin.write(message);

      this.logger.debug(
        `Scroll event forwarded to SCRCPY: (${event.x}, ${event.y}) h=${event.hScroll} v=${event.vScroll}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to forward scroll event: ${error.message}`,
        error.stack,
      );
      client.emit("error", { message: "Failed to forward scroll event" });
    }
  }

  /**
   * 广播视频帧到所有订阅者
   *
   * @param deviceId 设备 ID
   * @param frame 视频帧数据
   */
  broadcastVideoFrame(deviceId: string, frame: Buffer) {
    const subscribers = this.deviceSubscribers.get(deviceId);
    if (subscribers && subscribers.size > 0) {
      for (const socketId of subscribers) {
        this.server.to(socketId).emit("video_frame", {
          deviceId,
          data: frame,
        });
      }
    }
  }

  /**
   * 广播音频帧到所有订阅者
   *
   * @param deviceId 设备 ID
   * @param frame 音频帧数据
   */
  broadcastAudioFrame(deviceId: string, frame: Buffer) {
    const subscribers = this.deviceSubscribers.get(deviceId);
    if (subscribers && subscribers.size > 0) {
      for (const socketId of subscribers) {
        this.server.to(socketId).emit("audio_frame", {
          deviceId,
          data: frame,
        });
      }
    }
  }

  /**
   * 订阅设备
   */
  private subscribeToDevice(socketId: string, deviceId: string) {
    // 如果已经订阅了其他设备，先取消订阅
    const currentDeviceId = this.clientSessions.get(socketId);
    if (currentDeviceId) {
      this.unsubscribeFromDevice(socketId, currentDeviceId);
    }

    // 添加到客户端会话
    this.clientSessions.set(socketId, deviceId);

    // 添加到设备订阅者
    if (!this.deviceSubscribers.has(deviceId)) {
      this.deviceSubscribers.set(deviceId, new Set());
    }
    this.deviceSubscribers.get(deviceId)!.add(socketId);
  }

  /**
   * 取消订阅设备
   */
  private unsubscribeFromDevice(socketId: string, deviceId: string) {
    // 从客户端会话移除
    this.clientSessions.delete(socketId);

    // 从设备订阅者移除
    const subscribers = this.deviceSubscribers.get(deviceId);
    if (subscribers) {
      subscribers.delete(socketId);
      if (subscribers.size === 0) {
        this.deviceSubscribers.delete(deviceId);
      }
    }
  }

  /**
   * 获取设备订阅者数量
   */
  getSubscriberCount(deviceId: string): number {
    const subscribers = this.deviceSubscribers.get(deviceId);
    return subscribers ? subscribers.size : 0;
  }

  /**
   * 获取所有活跃会话
   */
  getActiveSessions(): Array<{ deviceId: string; subscribers: number }> {
    const sessions: Array<{ deviceId: string; subscribers: number }> = [];
    for (const [deviceId, subscribers] of this.deviceSubscribers.entries()) {
      sessions.push({
        deviceId,
        subscribers: subscribers.size,
      });
    }
    return sessions;
  }

  /**
   * 处理特殊按键（BACK, HOME, APP_SWITCH）
   *
   * @param deviceId 设备 ID
   * @param eventType 事件类型
   * @param client WebSocket 客户端
   */
  private handleSpecialKey(
    deviceId: string,
    eventType: ScrcpyEventType,
    client: Socket,
  ) {
    try {
      const process = this.scrcpyService.getProcess(deviceId);
      if (!process || !process.stdin) {
        client.emit("error", { message: "SCRCPY process not available" });
        return;
      }

      let messages: Buffer[];

      switch (eventType) {
        case ScrcpyEventType.BACK:
          messages = ScrcpyControlMessage.encodeBackButton();
          break;
        case ScrcpyEventType.HOME:
          messages = ScrcpyControlMessage.encodeHomeButton();
          break;
        case ScrcpyEventType.APP_SWITCH:
          messages = ScrcpyControlMessage.encodeAppSwitchButton();
          break;
        default:
          this.logger.warn(`Unknown special key: ${eventType}`);
          return;
      }

      // 发送按键按下和抬起事件
      for (const message of messages) {
        process.stdin.write(message);
      }

      this.logger.debug(`Special key forwarded to SCRCPY: ${eventType}`);
    } catch (error) {
      this.logger.error(
        `Failed to forward special key: ${error.message}`,
        error.stack,
      );
      client.emit("error", { message: "Failed to forward special key" });
    }
  }
}
