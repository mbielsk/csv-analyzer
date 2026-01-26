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
		// Recurring patterns
		`CREATE TABLE IF NOT EXISTS recurring_patterns (
			id TEXT PRIMARY KEY,
			source TEXT NOT NULL,
			category TEXT NOT NULL,
			description_pattern TEXT,
			avg_amount REAL NOT NULL,
			min_amount REAL,
			max_amount REAL,
			amount_variance REAL,
			frequency TEXT,
			avg_interval_days INTEGER,
			interval_variance REAL,
			last_occurrence TEXT,
			next_expected TEXT,
			occurrence_count INTEGER NOT NULL,
			confidence REAL NOT NULL,
			detection_mode TEXT NOT NULL,
			is_confirmed INTEGER,
			user_label TEXT,
			created_at INTEGER NOT NULL,
			updated_at INTEGER NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_recurring_source ON recurring_patterns(source)`,
		`CREATE INDEX IF NOT EXISTS idx_recurring_category ON recurring_patterns(category)`,
		`CREATE INDEX IF NOT EXISTS idx_recurring_confidence ON recurring_patterns(confidence DESC)`,
		// Junction table
		`CREATE TABLE IF NOT EXISTS recurring_transactions (
			pattern_id TEXT NOT NULL,
			transaction_id TEXT NOT NULL,
			PRIMARY KEY (pattern_id, transaction_id),
			FOREIGN KEY (pattern_id) REFERENCES recurring_patterns(id) ON DELETE CASCADE,
			FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS idx_recurring_tx_pattern ON recurring_transactions(pattern_id)`,
		`CREATE INDEX IF NOT EXISTS idx_recurring_tx_transaction ON recurring_transactions(transaction_id)`,
	}

	for _, m := range migrations {
		if _, err := DB.Exec(m); err != nil {
			return err
		}
	}

	log.Println("Database migrations completed")
	return nil
}
