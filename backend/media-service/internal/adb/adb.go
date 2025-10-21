package adb

import (
	"fmt"
	"os/exec"
	"strings"
)

// Service ADB 服务接口
type Service struct {
	adbPath string
}

// NewService 创建 ADB 服务
func NewService(adbPath string) *Service {
	if adbPath == "" {
		adbPath = "adb" // 使用系统 PATH 中的 adb
	}
	return &Service{
		adbPath: adbPath,
	}
}

// SendTouchDown 发送触摸按下事件
func (s *Service) SendTouchDown(deviceID string, x, y float64) error {
	cmd := exec.Command(
		s.adbPath,
		"-s", deviceID,
		"shell", "input", "touchscreen", "down",
		fmt.Sprintf("%.0f", x),
		fmt.Sprintf("%.0f", y),
	)
	return cmd.Run()
}

// SendTouchMove 发送触摸移动事件
func (s *Service) SendTouchMove(deviceID string, x, y float64) error {
	cmd := exec.Command(
		s.adbPath,
		"-s", deviceID,
		"shell", "input", "touchscreen", "move",
		fmt.Sprintf("%.0f", x),
		fmt.Sprintf("%.0f", y),
	)
	return cmd.Run()
}

// SendTouchUp 发送触摸释放事件
func (s *Service) SendTouchUp(deviceID string, x, y float64) error {
	cmd := exec.Command(
		s.adbPath,
		"-s", deviceID,
		"shell", "input", "touchscreen", "up",
		fmt.Sprintf("%.0f", x),
		fmt.Sprintf("%.0f", y),
	)
	return cmd.Run()
}

// SendTap 发送点击事件
func (s *Service) SendTap(deviceID string, x, y float64) error {
	cmd := exec.Command(
		s.adbPath,
		"-s", deviceID,
		"shell", "input", "tap",
		fmt.Sprintf("%.0f", x),
		fmt.Sprintf("%.0f", y),
	)
	return cmd.Run()
}

// SendSwipe 发送滑动事件
func (s *Service) SendSwipe(deviceID string, x1, y1, x2, y2 float64, duration int) error {
	cmd := exec.Command(
		s.adbPath,
		"-s", deviceID,
		"shell", "input", "swipe",
		fmt.Sprintf("%.0f", x1),
		fmt.Sprintf("%.0f", y1),
		fmt.Sprintf("%.0f", x2),
		fmt.Sprintf("%.0f", y2),
		fmt.Sprintf("%d", duration),
	)
	return cmd.Run()
}

// SendKeyEvent 发送按键事件
func (s *Service) SendKeyEvent(deviceID string, keyCode int) error {
	cmd := exec.Command(
		s.adbPath,
		"-s", deviceID,
		"shell", "input", "keyevent",
		fmt.Sprintf("%d", keyCode),
	)
	return cmd.Run()
}

// SendLongPress 发送长按按键事件
func (s *Service) SendLongPress(deviceID string, keyCode int) error {
	// ADB 没有直接的长按命令，使用 --longpress 参数
	cmd := exec.Command(
		s.adbPath,
		"-s", deviceID,
		"shell", "input", "keyevent",
		"--longpress",
		fmt.Sprintf("%d", keyCode),
	)
	return cmd.Run()
}

// SendText 发送文本输入
func (s *Service) SendText(deviceID string, text string) error {
	// 转义特殊字符
	escapedText := escapeText(text)

	cmd := exec.Command(
		s.adbPath,
		"-s", deviceID,
		"shell", "input", "text",
		escapedText,
	)
	return cmd.Run()
}

// SendHome 发送 Home 键
func (s *Service) SendHome(deviceID string) error {
	return s.SendKeyEvent(deviceID, 3) // KEYCODE_HOME = 3
}

// SendBack 发送返回键
func (s *Service) SendBack(deviceID string) error {
	return s.SendKeyEvent(deviceID, 4) // KEYCODE_BACK = 4
}

// SendMenu 发送菜单键
func (s *Service) SendMenu(deviceID string) error {
	return s.SendKeyEvent(deviceID, 82) // KEYCODE_MENU = 82
}

// SendPower 发送电源键
func (s *Service) SendPower(deviceID string) error {
	return s.SendKeyEvent(deviceID, 26) // KEYCODE_POWER = 26
}

// SendVolumeUp 发送音量+键
func (s *Service) SendVolumeUp(deviceID string) error {
	return s.SendKeyEvent(deviceID, 24) // KEYCODE_VOLUME_UP = 24
}

// SendVolumeDown 发送音量-键
func (s *Service) SendVolumeDown(deviceID string) error {
	return s.SendKeyEvent(deviceID, 25) // KEYCODE_VOLUME_DOWN = 25
}

// GetDevices 获取已连接的设备列表
func (s *Service) GetDevices() ([]string, error) {
	cmd := exec.Command(s.adbPath, "devices", "-l")
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(string(output), "\n")
	devices := []string{}

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "List of devices") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 2 && parts[1] == "device" {
			devices = append(devices, parts[0])
		}
	}

	return devices, nil
}

// IsDeviceConnected 检查设备是否已连接
func (s *Service) IsDeviceConnected(deviceID string) (bool, error) {
	devices, err := s.GetDevices()
	if err != nil {
		return false, err
	}

	for _, d := range devices {
		if d == deviceID {
			return true, nil
		}
	}

	return false, nil
}

// escapeText 转义特殊字符
func escapeText(text string) string {
	// ADB text 命令需要转义空格和特殊字符
	replacer := strings.NewReplacer(
		" ", "%s",
		"&", "\\&",
		"|", "\\|",
		";", "\\;",
		"<", "\\<",
		">", "\\>",
		"(", "\\(",
		")", "\\)",
		"$", "\\$",
		"`", "\\`",
		"\\", "\\\\",
		"\"", "\\\"",
		"'", "\\'",
	)
	return replacer.Replace(text)
}

// 常用按键代码
const (
	KEYCODE_UNKNOWN         = 0
	KEYCODE_SOFT_LEFT       = 1
	KEYCODE_SOFT_RIGHT      = 2
	KEYCODE_HOME            = 3
	KEYCODE_BACK            = 4
	KEYCODE_CALL            = 5
	KEYCODE_ENDCALL         = 6
	KEYCODE_0               = 7
	KEYCODE_1               = 8
	KEYCODE_2               = 9
	KEYCODE_3               = 10
	KEYCODE_4               = 11
	KEYCODE_5               = 12
	KEYCODE_6               = 13
	KEYCODE_7               = 14
	KEYCODE_8               = 15
	KEYCODE_9               = 16
	KEYCODE_STAR            = 17
	KEYCODE_POUND           = 18
	KEYCODE_DPAD_UP         = 19
	KEYCODE_DPAD_DOWN       = 20
	KEYCODE_DPAD_LEFT       = 21
	KEYCODE_DPAD_RIGHT      = 22
	KEYCODE_DPAD_CENTER     = 23
	KEYCODE_VOLUME_UP       = 24
	KEYCODE_VOLUME_DOWN     = 25
	KEYCODE_POWER           = 26
	KEYCODE_CAMERA          = 27
	KEYCODE_CLEAR           = 28
	KEYCODE_A               = 29
	KEYCODE_B               = 30
	KEYCODE_C               = 31
	KEYCODE_D               = 32
	KEYCODE_E               = 33
	KEYCODE_F               = 34
	KEYCODE_G               = 35
	KEYCODE_H               = 36
	KEYCODE_I               = 37
	KEYCODE_J               = 38
	KEYCODE_K               = 39
	KEYCODE_L               = 40
	KEYCODE_M               = 41
	KEYCODE_N               = 42
	KEYCODE_O               = 43
	KEYCODE_P               = 44
	KEYCODE_Q               = 45
	KEYCODE_R               = 46
	KEYCODE_S               = 47
	KEYCODE_T               = 48
	KEYCODE_U               = 49
	KEYCODE_V               = 50
	KEYCODE_W               = 51
	KEYCODE_X               = 52
	KEYCODE_Y               = 53
	KEYCODE_Z               = 54
	KEYCODE_COMMA           = 55
	KEYCODE_PERIOD          = 56
	KEYCODE_ALT_LEFT        = 57
	KEYCODE_ALT_RIGHT       = 58
	KEYCODE_SHIFT_LEFT      = 59
	KEYCODE_SHIFT_RIGHT     = 60
	KEYCODE_TAB             = 61
	KEYCODE_SPACE           = 62
	KEYCODE_ENTER           = 66
	KEYCODE_DEL             = 67
	KEYCODE_GRAVE           = 68
	KEYCODE_MINUS           = 69
	KEYCODE_EQUALS          = 70
	KEYCODE_LEFT_BRACKET    = 71
	KEYCODE_RIGHT_BRACKET   = 72
	KEYCODE_BACKSLASH       = 73
	KEYCODE_SEMICOLON       = 74
	KEYCODE_APOSTROPHE      = 75
	KEYCODE_SLASH           = 76
	KEYCODE_AT              = 77
	KEYCODE_PLUS            = 81
	KEYCODE_MENU            = 82
	KEYCODE_NOTIFICATION    = 83
	KEYCODE_SEARCH          = 84
	KEYCODE_PAGE_UP         = 92
	KEYCODE_PAGE_DOWN       = 93
	KEYCODE_ESCAPE          = 111
	KEYCODE_FORWARD_DEL     = 112
	KEYCODE_CTRL_LEFT       = 113
	KEYCODE_CTRL_RIGHT      = 114
	KEYCODE_CAPS_LOCK       = 115
	KEYCODE_SCROLL_LOCK     = 116
	KEYCODE_META_LEFT       = 117
	KEYCODE_META_RIGHT      = 118
	KEYCODE_FUNCTION        = 119
	KEYCODE_SYSRQ           = 120
	KEYCODE_BREAK           = 121
	KEYCODE_MOVE_HOME       = 122
	KEYCODE_MOVE_END        = 123
	KEYCODE_INSERT          = 124
	KEYCODE_FORWARD         = 125
	KEYCODE_MEDIA_PLAY      = 126
	KEYCODE_MEDIA_PAUSE     = 127
	KEYCODE_MEDIA_CLOSE     = 128
	KEYCODE_MEDIA_EJECT     = 129
	KEYCODE_MEDIA_RECORD    = 130
	KEYCODE_F1              = 131
	KEYCODE_F2              = 132
	KEYCODE_F3              = 133
	KEYCODE_F4              = 134
	KEYCODE_F5              = 135
	KEYCODE_F6              = 136
	KEYCODE_F7              = 137
	KEYCODE_F8              = 138
	KEYCODE_F9              = 139
	KEYCODE_F10             = 140
	KEYCODE_F11             = 141
	KEYCODE_F12             = 142
)
