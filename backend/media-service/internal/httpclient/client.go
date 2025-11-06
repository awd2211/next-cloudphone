package httpclient

import (
	"context"
	"net/http"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// Client is an HTTP client with OpenTelemetry instrumentation
type Client struct {
	*http.Client
}

// New creates a new HTTP client with OpenTelemetry tracing
func New() *Client {
	// Create HTTP client with otelhttp transport for automatic context propagation
	transport := otelhttp.NewTransport(
		http.DefaultTransport,
		otelhttp.WithSpanNameFormatter(func(operation string, r *http.Request) string {
			return operation + " " + r.URL.Path
		}),
	)

	return &Client{
		Client: &http.Client{
			Transport: transport,
			Timeout:   30 * time.Second,
		},
	}
}

// Do executes an HTTP request with context propagation
func (c *Client) Do(req *http.Request) (*http.Response, error) {
	return c.Client.Do(req)
}

// Get performs a GET request with trace context
func (c *Client) Get(ctx context.Context, url string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	return c.Do(req)
}

// Post performs a POST request with trace context
func (c *Client) Post(ctx context.Context, url, contentType string, body interface{}) (*http.Response, error) {
	// Implementation would include body marshaling
	// For now, this is a placeholder showing the pattern
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", contentType)
	return c.Do(req)
}
