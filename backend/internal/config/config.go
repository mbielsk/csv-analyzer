package config

import (
	"encoding/json"
	"os"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	Port        string `json:"port" env:"PORT" envDefault:"8080"`
	DBPath      string `json:"db_path" env:"DB_PATH" envDefault:"./data/finance.db"`
	GinMode     string `json:"gin_mode" env:"GIN_MODE" envDefault:"debug"`
	CORSOrigins string `json:"cors_origins" env:"CORS_ORIGINS" envDefault:"http://localhost:5173,http://localhost:5300"`
}

var Cfg *Config

func Load() error {
	Cfg = &Config{}

	// Try to load from config.json first
	if data, err := os.ReadFile("config.json"); err == nil {
		if err := json.Unmarshal(data, Cfg); err != nil {
			return err
		}
	}

	// Override with environment variables
	if err := env.Parse(Cfg); err != nil {
		return err
	}

	return nil
}
