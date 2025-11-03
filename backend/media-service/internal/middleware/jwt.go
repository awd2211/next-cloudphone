package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/cloudphone/media-service/internal/logger"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

// JWTClaims JWT token 中的声明
type JWTClaims struct {
	UserID      string   `json:"sub"`
	Username    string   `json:"username"`
	Email       string   `json:"email"`
	Roles       []string `json:"roles"`
	Permissions []string `json:"permissions"`
	TenantID    string   `json:"tenantId"`
	jwt.RegisteredClaims
}

// UserContext 用户上下文信息
type UserContext struct {
	UserID      string
	Username    string
	Email       string
	Roles       []string
	Permissions []string
	TenantID    string
}

const (
	// UserContextKey 用于在 gin.Context 中存储用户信息的key
	UserContextKey = "user"
)

// JWTMiddleware JWT 认证中间件
// 验证请求头中的 JWT token，并将解析后的用户信息存储到 context 中
func JWTMiddleware() gin.HandlerFunc {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		logger.Fatal("jwt_secret_not_configured",
			zap.String("env_var", "JWT_SECRET"),
			zap.String("message", "JWT_SECRET environment variable is required"),
		)
	}

	return func(c *gin.Context) {
		// 从请求头获取 Authorization token
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			logger.Warn("jwt_missing_token",
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "未授权访问",
			})
			c.Abort()
			return
		}

		// 解析 Bearer token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			// 没有 "Bearer " 前缀
			logger.Warn("jwt_invalid_format",
				zap.String("header", authHeader[:min(len(authHeader), 20)]),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "未授权访问",
			})
			c.Abort()
			return
		}

		// 解析和验证 token
		token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
			// 验证签名算法
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})

		if err != nil {
			logger.Warn("jwt_parse_failed",
				zap.Error(err),
				zap.String("path", c.Request.URL.Path),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "未授权访问",
			})
			c.Abort()
			return
		}

		// 提取 claims
		claims, ok := token.Claims.(*JWTClaims)
		if !ok || !token.Valid {
			logger.Warn("jwt_invalid_claims",
				zap.Bool("claims_ok", ok),
				zap.Bool("token_valid", token.Valid),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "未授权访问",
			})
			c.Abort()
			return
		}

		// 验证必需字段
		if claims.UserID == "" {
			logger.Warn("jwt_missing_user_id")
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "无效的 Token",
			})
			c.Abort()
			return
		}

		// 验证 issuer 和 audience（与 NestJS 服务保持一致）
		expectedIssuer := "cloudphone-platform"
		expectedAudience := "cloudphone-users"

		if claims.Issuer != expectedIssuer {
			logger.Warn("jwt_invalid_issuer",
				zap.String("expected", expectedIssuer),
				zap.String("actual", claims.Issuer),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "未授权访问",
			})
			c.Abort()
			return
		}

		// 验证 audience（可能是字符串数组）
		validAudience := false
		for _, aud := range claims.Audience {
			if aud == expectedAudience {
				validAudience = true
				break
			}
		}
		if !validAudience {
			logger.Warn("jwt_invalid_audience",
				zap.String("expected", expectedAudience),
				zap.Strings("actual", claims.Audience),
			)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "未授权访问",
			})
			c.Abort()
			return
		}

		// 将用户信息存储到 context 中
		userCtx := &UserContext{
			UserID:      claims.UserID,
			Username:    claims.Username,
			Email:       claims.Email,
			Roles:       claims.Roles,
			Permissions: claims.Permissions,
			TenantID:    claims.TenantID,
		}
		c.Set(UserContextKey, userCtx)

		logger.Debug("jwt_authenticated",
			zap.String("user_id", userCtx.UserID),
			zap.String("username", userCtx.Username),
			zap.Int("permissions_count", len(userCtx.Permissions)),
		)

		// 继续处理请求
		c.Next()
	}
}

// RequirePermission 权限检查中间件
// 要求用户必须拥有指定的权限之一
func RequirePermission(requiredPermissions ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从 context 获取用户信息
		userCtxRaw, exists := c.Get(UserContextKey)
		if !exists {
			logger.Error("permission_check_no_user",
				zap.String("path", c.Request.URL.Path),
				zap.String("note", "JWTMiddleware should be applied before RequirePermission"),
			)
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "用户未认证",
			})
			c.Abort()
			return
		}

		userCtx, ok := userCtxRaw.(*UserContext)
		if !ok {
			logger.Error("permission_check_invalid_user_context")
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "用户上下文无效",
			})
			c.Abort()
			return
		}

		// 检查用户是否拥有任一所需权限
		hasPermission := false
		userPermissionsMap := make(map[string]bool)
		for _, perm := range userCtx.Permissions {
			userPermissionsMap[perm] = true
		}

		for _, required := range requiredPermissions {
			if userPermissionsMap[required] {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			logger.Warn("permission_denied",
				zap.String("user_id", userCtx.UserID),
				zap.String("username", userCtx.Username),
				zap.Strings("required_permissions", requiredPermissions),
				zap.Int("user_permissions_count", len(userCtx.Permissions)),
			)
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": fmt.Sprintf("需要以下权限之一: %v", requiredPermissions),
			})
			c.Abort()
			return
		}

		logger.Debug("permission_granted",
			zap.String("user_id", userCtx.UserID),
			zap.Strings("required_permissions", requiredPermissions),
		)

		// 继续处理请求
		c.Next()
	}
}

// GetUserContext 从 gin.Context 中获取用户上下文
func GetUserContext(c *gin.Context) (*UserContext, bool) {
	userCtxRaw, exists := c.Get(UserContextKey)
	if !exists {
		return nil, false
	}

	userCtx, ok := userCtxRaw.(*UserContext)
	return userCtx, ok
}
