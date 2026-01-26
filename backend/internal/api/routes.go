package api

import (
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"kiro-finance-backend/internal/config"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	// CORS
	origins := strings.Split(config.Cfg.CORSOrigins, ",")
	r.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		AllowCredentials: true,
	}))

	api := r.Group("/api")
	{
		// Files
		api.GET("/files", GetFiles)
		api.GET("/files/:id", GetFile)
		api.POST("/files", UploadFile)
		api.PUT("/files/:id", ReimportFile)
		api.DELETE("/files/:id", DeleteFile)

		// Transactions
		api.GET("/transactions", GetTransactions)
		api.GET("/transactions/:id", GetTransaction)
		api.PUT("/transactions/:id", UpdateTransaction)
		api.DELETE("/transactions/:id", DeleteTransaction)

		// Stats
		api.GET("/stats/summary", GetSummary)
		api.GET("/stats/categories", GetCategories)
		api.GET("/stats/sources", GetSources)
		api.GET("/stats/top-category", GetTopCategory)

		// Recurring
		api.GET("/recurring", GetRecurringPatterns)
		api.GET("/recurring/:id", GetRecurringPattern)
		api.PUT("/recurring/:id", UpdateRecurringPattern)
		api.DELETE("/recurring/:id", DeleteRecurringPattern)
		api.POST("/recurring/recalculate", RecalculateRecurring)
	}

	return r
}
