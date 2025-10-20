package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// 设置运行模式
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.DebugMode)
	}

	router := gin.Default()

	// 健康检查接口
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"service":   "media-service",
			"timestamp": fmt.Sprintf("%v", http.TimeFormat),
		})
	})

	// WebRTC 信令服务
	api := router.Group("/api/media")
	{
		api.POST("/offer", handleOffer)
		api.POST("/answer", handleAnswer)
		api.POST("/ice-candidate", handleICECandidate)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3003"
	}

	log.Printf("Media Service is running on: http://localhost:%s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func handleOffer(c *gin.Context) {
	// TODO: 实现 WebRTC offer 处理逻辑
	c.JSON(http.StatusOK, gin.H{
		"message": "offer received",
	})
}

func handleAnswer(c *gin.Context) {
	// TODO: 实现 WebRTC answer 处理逻辑
	c.JSON(http.StatusOK, gin.H{
		"message": "answer received",
	})
}

func handleICECandidate(c *gin.Context) {
	// TODO: 实现 ICE candidate 处理逻辑
	c.JSON(http.StatusOK, gin.H{
		"message": "ice candidate received",
	})
}
