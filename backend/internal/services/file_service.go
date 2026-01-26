package services

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"kiro-finance-backend/internal/db"
	"kiro-finance-backend/internal/models"
)

func GetAllFiles() ([]models.File, error) {
	rows, err := db.DB.Query(`
		SELECT id, name, uploaded_at, created_at, updated_at 
		FROM files 
		ORDER BY uploaded_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []models.File
	for rows.Next() {
		var f models.File
		if err := rows.Scan(&f.ID, &f.Name, &f.UploadedAt, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		files = append(files, f)
	}

	return files, nil
}

func GetFileByID(id string) (*models.File, error) {
	var f models.File
	err := db.DB.QueryRow(`
		SELECT id, name, uploaded_at, created_at, updated_at 
		FROM files WHERE id = ?
	`, id).Scan(&f.ID, &f.Name, &f.UploadedAt, &f.CreatedAt, &f.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &f, nil
}

func CreateFile(name string) (*models.File, error) {
	now := time.Now().Unix()
	file := &models.File{
		ID:         uuid.New().String(),
		Name:       name,
		UploadedAt: now,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	_, err := db.DB.Exec(`
		INSERT INTO files (id, name, uploaded_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, file.ID, file.Name, file.UploadedAt, file.CreatedAt, file.UpdatedAt)

	if err != nil {
		return nil, err
	}

	return file, nil
}

func DeleteFile(id string) error {
	_, err := db.DB.Exec("DELETE FROM files WHERE id = ?", id)
	return err
}

func SaveTransactions(transactions []models.Transaction) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO transactions (id, file_id, category, source, description, amount, amount_original, is_paid, is_cash, transaction_date, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, t := range transactions {
		isPaid := 0
		if t.IsPaid {
			isPaid = 1
		}

		_, err := stmt.Exec(
			t.ID, t.FileID, t.Category, t.Source, t.Description,
			t.Amount, t.AmountOriginal, isPaid, t.IsCash, t.TransactionDate, t.CreatedAt,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func DeleteTransactionsByFileID(fileID string) error {
	_, err := db.DB.Exec("DELETE FROM transactions WHERE file_id = ?", fileID)
	return err
}
