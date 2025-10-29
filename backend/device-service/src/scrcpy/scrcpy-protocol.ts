/**
 * SCRCPY 控制协议编码器
 *
 * SCRCPY 使用二进制协议进行设备控制。
 * 参考: https://github.com/Genymobile/scrcpy/blob/master/app/src/control_msg.h
 *
 * 消息格式：
 * - 所有整数均为大端序（Big Endian）
 * - 第一个字节为消息类型
 * - 后续字节为消息参数
 *
 * Phase 2: 实现核心控制消息
 * - INJECT_TOUCH_EVENT (触摸)
 * - INJECT_KEYCODE (按键)
 * - INJECT_SCROLL_EVENT (滚动)
 */

/**
 * SCRCPY 控制消息类型
 *
 * 参考: scrcpy/app/src/control_msg.h
 */
export enum ScrcpyControlMessageType {
  /** 注入按键事件 */
  INJECT_KEYCODE = 0,

  /** 注入文本 */
  INJECT_TEXT = 1,

  /** 注入触摸事件 */
  INJECT_TOUCH_EVENT = 2,

  /** 注入滚动事件 */
  INJECT_SCROLL_EVENT = 3,

  /** 设置剪贴板 */
  SET_CLIPBOARD = 9,

  /** 设置屏幕电源模式 */
  SET_SCREEN_POWER_MODE = 10,

  /** 旋转设备 */
  ROTATE_DEVICE = 11,
}

/**
 * Android 触摸事件动作
 */
export enum AndroidMotionEventAction {
  /** 按下 */
  DOWN = 0,

  /** 抬起 */
  UP = 1,

  /** 移动 */
  MOVE = 2,

  /** 取消 */
  CANCEL = 3,
}

/**
 * Android 按键事件动作
 */
export enum AndroidKeyEventAction {
  /** 按下 */
  DOWN = 0,

  /** 抬起 */
  UP = 1,
}

/**
 * SCRCPY 控制消息编码器
 */
export class ScrcpyControlMessage {
  /**
   * 编码触摸事件
   *
   * 消息格式 (29 字节):
   * - [0] type: INJECT_TOUCH_EVENT (1 byte)
   * - [1] action: DOWN/UP/MOVE (1 byte)
   * - [2-9] pointerId: 指针 ID (8 bytes, int64)
   * - [10-13] x: X 坐标 (4 bytes, int32)
   * - [14-17] y: Y 坐标 (4 bytes, int32)
   * - [18-19] width: 屏幕宽度 (2 bytes, uint16)
   * - [20-21] height: 屏幕高度 (2 bytes, uint16)
   * - [22-23] pressure: 压力 (2 bytes, uint16, 0xFFFF = 1.0)
   * - [24-27] buttons: 按钮状态 (4 bytes, uint32)
   * - [28] actionButton: 动作按钮 (1 byte)
   *
   * @param params 触摸事件参数
   * @returns 编码后的二进制消息
   */
  static encodeTouch(params: {
    action: AndroidMotionEventAction;
    pointerId: number;
    x: number;
    y: number;
    width: number;
    height: number;
    pressure?: number;
    buttons?: number;
  }): Buffer {
    const buffer = Buffer.alloc(29);
    let offset = 0;

    // [0] 消息类型
    buffer.writeUInt8(ScrcpyControlMessageType.INJECT_TOUCH_EVENT, offset);
    offset += 1;

    // [1] 动作
    buffer.writeUInt8(params.action, offset);
    offset += 1;

    // [2-9] 指针 ID (BigInt64BE)
    buffer.writeBigInt64BE(BigInt(params.pointerId), offset);
    offset += 8;

    // [10-13] X 坐标
    buffer.writeInt32BE(params.x, offset);
    offset += 4;

    // [14-17] Y 坐标
    buffer.writeInt32BE(params.y, offset);
    offset += 4;

    // [18-19] 屏幕宽度
    buffer.writeUInt16BE(params.width, offset);
    offset += 2;

    // [20-21] 屏幕高度
    buffer.writeUInt16BE(params.height, offset);
    offset += 2;

    // [22-23] 压力 (0xFFFF = 1.0)
    const pressure = params.pressure !== undefined
      ? Math.round(params.pressure * 0xFFFF)
      : 0xFFFF;
    buffer.writeUInt16BE(pressure, offset);
    offset += 2;

    // [24-27] 按钮状态
    buffer.writeUInt32BE(params.buttons || 0, offset);
    offset += 4;

    // [28] 动作按钮
    buffer.writeUInt8(0, offset);

    return buffer;
  }

  /**
   * 编码按键事件
   *
   * 消息格式 (14 字节):
   * - [0] type: INJECT_KEYCODE (1 byte)
   * - [1] action: DOWN/UP (1 byte)
   * - [2-5] keycode: Android keycode (4 bytes, int32)
   * - [6-9] repeat: 重复次数 (4 bytes, int32)
   * - [10-13] metastate: Meta 状态 (4 bytes, int32)
   *
   * @param params 按键事件参数
   * @returns 编码后的二进制消息
   */
  static encodeKeycode(params: {
    action: AndroidKeyEventAction;
    keycode: number;
    repeat?: number;
    metastate?: number;
  }): Buffer {
    const buffer = Buffer.alloc(14);
    let offset = 0;

    // [0] 消息类型
    buffer.writeUInt8(ScrcpyControlMessageType.INJECT_KEYCODE, offset);
    offset += 1;

    // [1] 动作
    buffer.writeUInt8(params.action, offset);
    offset += 1;

    // [2-5] Keycode
    buffer.writeInt32BE(params.keycode, offset);
    offset += 4;

    // [6-9] 重复次数
    buffer.writeInt32BE(params.repeat || 0, offset);
    offset += 4;

    // [10-13] Metastate
    buffer.writeInt32BE(params.metastate || 0, offset);

    return buffer;
  }

  /**
   * 编码滚动事件
   *
   * 消息格式 (25 字节):
   * - [0] type: INJECT_SCROLL_EVENT (1 byte)
   * - [1-4] x: X 坐标 (4 bytes, int32)
   * - [5-8] y: Y 坐标 (4 bytes, int32)
   * - [9-10] width: 屏幕宽度 (2 bytes, uint16)
   * - [11-12] height: 屏幕高度 (2 bytes, uint16)
   * - [13-16] hScroll: 水平滚动量 (4 bytes, int32)
   * - [17-20] vScroll: 垂直滚动量 (4 bytes, int32)
   * - [21-24] buttons: 按钮状态 (4 bytes, uint32)
   *
   * @param params 滚动事件参数
   * @returns 编码后的二进制消息
   */
  static encodeScroll(params: {
    x: number;
    y: number;
    width: number;
    height: number;
    hScroll: number;
    vScroll: number;
    buttons?: number;
  }): Buffer {
    const buffer = Buffer.alloc(25);
    let offset = 0;

    // [0] 消息类型
    buffer.writeUInt8(ScrcpyControlMessageType.INJECT_SCROLL_EVENT, offset);
    offset += 1;

    // [1-4] X 坐标
    buffer.writeInt32BE(params.x, offset);
    offset += 4;

    // [5-8] Y 坐标
    buffer.writeInt32BE(params.y, offset);
    offset += 4;

    // [9-10] 屏幕宽度
    buffer.writeUInt16BE(params.width, offset);
    offset += 2;

    // [11-12] 屏幕高度
    buffer.writeUInt16BE(params.height, offset);
    offset += 2;

    // [13-16] 水平滚动量
    buffer.writeInt32BE(params.hScroll, offset);
    offset += 4;

    // [17-20] 垂直滚动量
    buffer.writeInt32BE(params.vScroll, offset);
    offset += 4;

    // [21-24] 按钮状态
    buffer.writeUInt32BE(params.buttons || 0, offset);

    return buffer;
  }

  /**
   * 编码文本注入
   *
   * 消息格式 (5 + text.length 字节):
   * - [0] type: INJECT_TEXT (1 byte)
   * - [1-4] length: 文本长度 (4 bytes, uint32)
   * - [5...] text: UTF-8 编码的文本
   *
   * @param text 要注入的文本
   * @returns 编码后的二进制消息
   */
  static encodeText(text: string): Buffer {
    const textBuffer = Buffer.from(text, 'utf8');
    const buffer = Buffer.alloc(5 + textBuffer.length);
    let offset = 0;

    // [0] 消息类型
    buffer.writeUInt8(ScrcpyControlMessageType.INJECT_TEXT, offset);
    offset += 1;

    // [1-4] 文本长度
    buffer.writeUInt32BE(textBuffer.length, offset);
    offset += 4;

    // [5...] 文本内容
    textBuffer.copy(buffer, offset);

    return buffer;
  }

  /**
   * 编码 BACK 按键
   *
   * @returns 编码后的 BACK 按键消息（按下 + 抬起）
   */
  static encodeBackButton(): Buffer[] {
    const KEYCODE_BACK = 4;
    return [
      ScrcpyControlMessage.encodeKeycode({
        action: AndroidKeyEventAction.DOWN,
        keycode: KEYCODE_BACK,
      }),
      ScrcpyControlMessage.encodeKeycode({
        action: AndroidKeyEventAction.UP,
        keycode: KEYCODE_BACK,
      }),
    ];
  }

  /**
   * 编码 HOME 按键
   *
   * @returns 编码后的 HOME 按键消息（按下 + 抬起）
   */
  static encodeHomeButton(): Buffer[] {
    const KEYCODE_HOME = 3;
    return [
      ScrcpyControlMessage.encodeKeycode({
        action: AndroidKeyEventAction.DOWN,
        keycode: KEYCODE_HOME,
      }),
      ScrcpyControlMessage.encodeKeycode({
        action: AndroidKeyEventAction.UP,
        keycode: KEYCODE_HOME,
      }),
    ];
  }

  /**
   * 编码 APP_SWITCH 按键（任务切换）
   *
   * @returns 编码后的 APP_SWITCH 按键消息（按下 + 抬起）
   */
  static encodeAppSwitchButton(): Buffer[] {
    const KEYCODE_APP_SWITCH = 187;
    return [
      ScrcpyControlMessage.encodeKeycode({
        action: AndroidKeyEventAction.DOWN,
        keycode: KEYCODE_APP_SWITCH,
      }),
      ScrcpyControlMessage.encodeKeycode({
        action: AndroidKeyEventAction.UP,
        keycode: KEYCODE_APP_SWITCH,
      }),
    ];
  }

  /**
   * 编码设置剪贴板
   *
   * 消息格式 (10 + text.length 字节):
   * - [0] type: SET_CLIPBOARD (1 byte)
   * - [1] paste: 是否自动粘贴 (1 byte)
   * - [2-9] sequence: 序列号 (8 bytes, uint64)
   * - [10-13] length: 文本长度 (4 bytes, uint32)
   * - [14...] text: UTF-8 编码的文本
   *
   * @param text 剪贴板文本
   * @param paste 是否自动粘贴
   * @returns 编码后的二进制消息
   */
  static encodeSetClipboard(text: string, paste: boolean = false): Buffer {
    const textBuffer = Buffer.from(text, 'utf8');
    const buffer = Buffer.alloc(14 + textBuffer.length);
    let offset = 0;

    // [0] 消息类型
    buffer.writeUInt8(ScrcpyControlMessageType.SET_CLIPBOARD, offset);
    offset += 1;

    // [1] 是否自动粘贴
    buffer.writeUInt8(paste ? 1 : 0, offset);
    offset += 1;

    // [2-9] 序列号（使用时间戳）
    buffer.writeBigUInt64BE(BigInt(Date.now()), offset);
    offset += 8;

    // [10-13] 文本长度
    buffer.writeUInt32BE(textBuffer.length, offset);
    offset += 4;

    // [14...] 文本内容
    textBuffer.copy(buffer, offset);

    return buffer;
  }
}
