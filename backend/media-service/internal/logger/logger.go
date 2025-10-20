package logger

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var (
	// Log 全局 logger 实例
	Log *zap.Logger
	// Sugar 全局 SugaredLogger 实例（更方便的 API）
	Sugar *zap.SugaredLogger
)

// Init 初始化日志系统
//
// 参考 Winston/structlog 配置模式：
// - 开发环境：彩色控制台输出，易读格式
// - 生产环境：JSON 格式输出，结构化日志
func Init() {
	environment := getEnv("NODE_ENV", "development")
	logLevel := getLogLevel()

	var config zap.Config

	if environment == "production" {
		// 生产环境：JSON 格式（类似 Winston 的 prodFormat）
		config = zap.Config{
			Level:       zap.NewAtomicLevelAt(logLevel),
			Development: false,
			Encoding:    "json",
			EncoderConfig: zapcore.EncoderConfig{
				TimeKey:        "timestamp",
				LevelKey:       "level",
				NameKey:        "logger",
				CallerKey:      "caller",
				FunctionKey:    zapcore.OmitKey,
				MessageKey:     "message",
				StacktraceKey:  "stacktrace",
				LineEnding:     zapcore.DefaultLineEnding,
				EncodeLevel:    zapcore.LowercaseLevelEncoder,
				EncodeTime:     zapcore.ISO8601TimeEncoder,
				EncodeDuration: zapcore.SecondsDurationEncoder,
				EncodeCaller:   zapcore.ShortCallerEncoder,
			},
			OutputPaths:      []string{"stdout"},
			ErrorOutputPaths: []string{"stderr"},
		}

		// 可选：文件日志（类似 Winston 的文件 transport）
		if getEnv("ENABLE_FILE_LOGGING", "false") == "true" {
			config.OutputPaths = append(config.OutputPaths, "logs/combined.log")
			config.ErrorOutputPaths = append(config.ErrorOutputPaths, "logs/error.log")
		}
	} else {
		// 开发环境：彩色易读输出（类似 Winston 的 devFormat）
		config = zap.Config{
			Level:       zap.NewAtomicLevelAt(logLevel),
			Development: true,
			Encoding:    "console",
			EncoderConfig: zapcore.EncoderConfig{
				TimeKey:        "T",
				LevelKey:       "L",
				NameKey:        "N",
				CallerKey:      "C",
				FunctionKey:    zapcore.OmitKey,
				MessageKey:     "M",
				StacktraceKey:  "S",
				LineEnding:     zapcore.DefaultLineEnding,
				EncodeLevel:    zapcore.CapitalColorLevelEncoder, // 彩色级别
				EncodeTime:     customTimeEncoder,
				EncodeDuration: zapcore.StringDurationEncoder,
				EncodeCaller:   zapcore.ShortCallerEncoder,
			},
			OutputPaths:      []string{"stdout"},
			ErrorOutputPaths: []string{"stderr"},
		}
	}

	// 构建 logger
	logger, err := config.Build(
		zap.AddCallerSkip(1), // 跳过包装函数，显示真实调用位置
	)
	if err != nil {
		panic(err)
	}

	Log = logger
	Sugar = logger.Sugar()

	// 替换全局 logger
	zap.ReplaceGlobals(logger)

	// 记录初始化信息
	Info("logger_initialized",
		zap.String("environment", environment),
		zap.String("log_level", logLevel.String()),
	)
}

// customTimeEncoder 自定义时间编码器（开发环境易读）
func customTimeEncoder(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
	enc.AppendString(t.Format("2006-01-02 15:04:05"))
}

// getLogLevel 获取日志级别
func getLogLevel() zapcore.Level {
	levelStr := getEnv("LOG_LEVEL", "")
	if levelStr == "" {
		// 根据环境设置默认级别
		if getEnv("NODE_ENV", "development") == "production" {
			return zapcore.InfoLevel
		}
		return zapcore.DebugLevel
	}

	var level zapcore.Level
	if err := level.Set(levelStr); err != nil {
		return zapcore.InfoLevel
	}
	return level
}

// getEnv 获取环境变量
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// 便捷的日志函数（类似 Winston 的 logger.info, logger.error 等）

// Debug 调试日志
func Debug(msg string, fields ...zap.Field) {
	Log.Debug(msg, fields...)
}

// Info 信息日志
func Info(msg string, fields ...zap.Field) {
	Log.Info(msg, fields...)
}

// Warn 警告日志
func Warn(msg string, fields ...zap.Field) {
	Log.Warn(msg, fields...)
}

// Error 错误日志
func Error(msg string, fields ...zap.Field) {
	Log.Error(msg, fields...)
}

// Fatal 致命错误（会退出程序）
func Fatal(msg string, fields ...zap.Field) {
	Log.Fatal(msg, fields...)
}

// With 创建带上下文的 logger（类似 Winston 的 child logger）
func With(fields ...zap.Field) *zap.Logger {
	return Log.With(fields...)
}

// Sync 同步缓冲区（应在程序退出前调用）
func Sync() error {
	return Log.Sync()
}
