package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"kiro-finance-backend/internal/api"
	"kiro-finance-backend/internal/config"
	"kiro-finance-backend/internal/db"
)

func main() {
	// Load configuration
	if err := config.Load(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	log.Printf("Config loaded: port=%s, db=%s, gin_mode=%s",
		config.Cfg.Port, config.Cfg.DBPath, config.Cfg.GinMode)

	// Set Gin mode
	gin.SetMode(config.Cfg.GinMode)

	// Initialize database
	if err := db.Init(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Setup router
	router := api.SetupRouter()

	log.Printf("Starting server on port %s", config.Cfg.Port)
	if err := router.Run(":" + config.Cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
