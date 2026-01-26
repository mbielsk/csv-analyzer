package db

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
	"kiro-finance-backend/internal/config"
)

var DB *sql.DB

func Init() error {
	dbPath := config.Cfg.DBPath

	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	var err error
	DB, err = sql.Open("sqlite3", dbPath+"?_foreign_keys=on")
	if err != nil {
		return err
	}

	if err = DB.Ping(); err != nil {
		return err
	}

	log.Printf("Connected to SQLite database: %s", dbPath)
	return runMigrations()
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}

func runMigrations() error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS files (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			uploaded_at INTEGER NOT NULL,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_files_name ON files(name)`,
		`CREATE TABLE IF NOT EXISTS transactions (
			id TEXT PRIMARY KEY,
			file_id TEXT NOT NULL,
			category TEXT NOT NULL,
			source TEXT NOT NULL,
			description TEXT NOT NULL,
			amount REAL NOT NULL,
			amount_original TEXT NOT NULL,
			is_paid INTEGER NOT NULL DEFAULT 0,
			is_cash TEXT,
			transaction_date TEXT,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_file_id ON transactions(file_id)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_is_paid ON transactions(is_paid)`,
		`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)`,
	}

	for _, m := range migrations {
		if _, err := DB.Exec(m); err != nil {
			return err
		}
	}

	log.Println("Database migrations completed")
	return nil
}
