package consul

import (
	"fmt"

	"github.com/cloudphone/media-service/internal/config"
	"github.com/cloudphone/media-service/internal/logger"
	consulapi "github.com/hashicorp/consul/api"
	"go.uber.org/zap"
)

// Client wraps Consul client for service registration
type Client struct {
	client  *consulapi.Client
	config  *config.Config
	checkID string
}

// NewClient creates a new Consul client
func NewClient(cfg *config.Config) (*Client, error) {
	consulConfig := consulapi.DefaultConfig()
	consulConfig.Address = fmt.Sprintf("%s:%d", cfg.ConsulHost, cfg.ConsulPort)

	client, err := consulapi.NewClient(consulConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create consul client: %w", err)
	}

	return &Client{
		client: client,
		config: cfg,
	}, nil
}

// RegisterService registers the media service with Consul
func (c *Client) RegisterService() error {
	// Service port as integer
	port, err := parsePort(c.config.Port)
	if err != nil {
		return fmt.Errorf("invalid port: %w", err)
	}

	serviceID := fmt.Sprintf("%s-%s-%d", c.config.ServiceName, c.config.ServiceHost, port)
	c.checkID = fmt.Sprintf("service:%s", serviceID)

	registration := &consulapi.AgentServiceRegistration{
		ID:      serviceID,
		Name:    c.config.ServiceName,
		Address: c.config.ServiceHost,
		Port:    port,
		Tags:    []string{"cloudphone", "media", "webrtc", "go", "v1"},
		Check: &consulapi.AgentServiceCheck{
			HTTP:                           fmt.Sprintf("http://%s:%d/health", c.config.ServiceHost, port),
			Interval:                       "15s",
			Timeout:                        "10s",
			DeregisterCriticalServiceAfter: "3m",
		},
	}

	err = c.client.Agent().ServiceRegister(registration)
	if err != nil {
		return fmt.Errorf("failed to register service: %w", err)
	}

	logger.Info("consul_service_registered",
		zap.String("service_id", serviceID),
		zap.String("service_name", c.config.ServiceName),
		zap.String("address", c.config.ServiceHost),
		zap.Int("port", port),
		zap.Strings("tags", registration.Tags),
	)

	return nil
}

// DeregisterService removes the service from Consul
func (c *Client) DeregisterService() error {
	port, err := parsePort(c.config.Port)
	if err != nil {
		return fmt.Errorf("invalid port: %w", err)
	}

	serviceID := fmt.Sprintf("%s-%s-%d", c.config.ServiceName, c.config.ServiceHost, port)

	err = c.client.Agent().ServiceDeregister(serviceID)
	if err != nil {
		return fmt.Errorf("failed to deregister service: %w", err)
	}

	logger.Info("consul_service_deregistered",
		zap.String("service_id", serviceID),
	)

	return nil
}

// parsePort converts string port to int
func parsePort(portStr string) (int, error) {
	var port int
	_, err := fmt.Sscanf(portStr, "%d", &port)
	if err != nil {
		return 0, err
	}
	return port, nil
}
