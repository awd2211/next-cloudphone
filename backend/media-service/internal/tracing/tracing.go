package tracing

import (
	"context"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"go.uber.org/zap"
)

// Config holds the configuration for OpenTelemetry tracing
type Config struct {
	ServiceName     string
	ServiceVersion  string
	JaegerEndpoint  string
	Enabled         bool
	SampleRate      float64
}

// InitTracing initializes OpenTelemetry tracing with Jaeger exporter
func InitTracing(cfg Config, logger *zap.Logger) (func(context.Context) error, error) {
	if !cfg.Enabled {
		logger.Info("tracing_disabled")
		return func(ctx context.Context) error { return nil }, nil
	}

	// Create OTLP HTTP exporter
	exporter, err := otlptracehttp.New(
		context.Background(),
		otlptracehttp.WithEndpoint(cfg.JaegerEndpoint),
		otlptracehttp.WithInsecure(), // Use insecure connection for local development
	)
	if err != nil {
		return nil, err
	}

	// Create resource with service information
	res, err := resource.New(
		context.Background(),
		resource.WithAttributes(
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceVersion(cfg.ServiceVersion),
		),
	)
	if err != nil {
		return nil, err
	}

	// Create trace provider with sampling
	var sampler sdktrace.Sampler
	if cfg.SampleRate > 0 && cfg.SampleRate < 1 {
		sampler = sdktrace.TraceIDRatioBased(cfg.SampleRate)
	} else {
		sampler = sdktrace.AlwaysSample()
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sampler),
	)

	// Set global trace provider
	otel.SetTracerProvider(tp)

	// Set global propagator for context propagation
	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{},
			propagation.Baggage{},
		),
	)

	logger.Info("opentelemetry_tracing_initialized",
		zap.String("service_name", cfg.ServiceName),
		zap.String("service_version", cfg.ServiceVersion),
		zap.String("jaeger_endpoint", cfg.JaegerEndpoint),
		zap.Float64("sample_rate", cfg.SampleRate),
	)

	// Return shutdown function
	return func(ctx context.Context) error {
		shutdownCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		return tp.Shutdown(shutdownCtx)
	}, nil
}
