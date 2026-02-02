package services

import (
	"fmt"
	"strings"

	"kiro-finance-backend/internal/db"
	"kiro-finance-backend/internal/models"
)

func GetTransactions(filter models.TransactionFilter, page, perPage int) (*models.PaginatedTransactions, error) {
	whereClause, args := buildWhereClause(filter)

	// Count total
	countQuery := "SELECT COUNT(*) FROM transactions t LEFT JOIN files f ON t.file_id = f.id" + whereClause
	var totalItems int
	if err := db.DB.QueryRow(countQuery, args...).Scan(&totalItems); err != nil {
		return nil, err
	}

	// Build query - if page/perPage are 0, return all
	usePagination := page > 0 && perPage > 0

	query := `
		SELECT t.id, t.file_id, t.category, t.source, t.description, 
		       t.amount, t.amount_original, t.is_paid, t.bank, t.transaction_date, t.created_at
		FROM transactions t
		LEFT JOIN files f ON t.file_id = f.id
	` + whereClause + " ORDER BY t.created_at DESC"

	if usePagination {
		offset := (page - 1) * perPage
		query += " LIMIT ? OFFSET ?"
		args = append(args, perPage, offset)
	}

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var t models.Transaction
		var isPaid int
		var transactionDate *string

		if err := rows.Scan(
			&t.ID, &t.FileID, &t.Category, &t.Source, &t.Description,
			&t.Amount, &t.AmountOriginal, &isPaid, &t.Bank, &transactionDate, &t.CreatedAt,
		); err != nil {
			return nil, err
		}

		t.IsPaid = isPaid == 1
		t.TransactionDate = transactionDate
		transactions = append(transactions, t)
	}

	// Calculate pagination info
	resultPerPage := perPage
	resultPage := page
	totalPages := 1

	if usePagination {
		totalPages = (totalItems + perPage - 1) / perPage
	} else {
		resultPerPage = totalItems
		resultPage = 1
	}

	return &models.PaginatedTransactions{
		Data: transactions,
		Pagination: models.Pagination{
			Page:       resultPage,
			PerPage:    resultPerPage,
			TotalItems: totalItems,
			TotalPages: totalPages,
		},
	}, nil
}

func GetTransactionByID(id string) (*models.Transaction, error) {
	var t models.Transaction
	var isPaid int
	var transactionDate *string

	err := db.DB.QueryRow(`
		SELECT id, file_id, category, source, description, amount, amount_original, 
		       is_paid, bank, transaction_date, created_at
		FROM transactions WHERE id = ?
	`, id).Scan(
		&t.ID, &t.FileID, &t.Category, &t.Source, &t.Description,
		&t.Amount, &t.AmountOriginal, &isPaid, &t.Bank, &transactionDate, &t.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	t.IsPaid = isPaid == 1
	t.TransactionDate = transactionDate
	return &t, nil
}

func UpdateTransaction(id string, updates map[string]interface{}) error {
	var setClauses []string
	var args []interface{}

	for key, value := range updates {
		setClauses = append(setClauses, fmt.Sprintf("%s = ?", key))
		args = append(args, value)
	}

	if len(setClauses) == 0 {
		return nil
	}

	args = append(args, id)
	query := fmt.Sprintf("UPDATE transactions SET %s WHERE id = ?", strings.Join(setClauses, ", "))
	_, err := db.DB.Exec(query, args...)
	return err
}

func DeleteTransaction(id string) error {
	_, err := db.DB.Exec("DELETE FROM transactions WHERE id = ?", id)
	return err
}

func buildWhereClause(filter models.TransactionFilter) (string, []interface{}) {
	var conditions []string
	var args []interface{}

	if len(filter.FileIDs) > 0 {
		placeholders := make([]string, len(filter.FileIDs))
		for i, id := range filter.FileIDs {
			placeholders[i] = "?"
			args = append(args, id)
		}
		conditions = append(conditions, fmt.Sprintf("t.file_id IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filter.FileNames) > 0 {
		var nameConditions []string
		for _, name := range filter.FileNames {
			nameConditions = append(nameConditions, "f.name LIKE ?")
			args = append(args, "%"+name+"%")
		}
		conditions = append(conditions, "("+strings.Join(nameConditions, " OR ")+")")
	}

	if len(filter.ExcludeCategories) > 0 {
		placeholders := make([]string, len(filter.ExcludeCategories))
		for i, cat := range filter.ExcludeCategories {
			placeholders[i] = "?"
			args = append(args, cat)
		}
		conditions = append(conditions, fmt.Sprintf("t.category NOT IN (%s)", strings.Join(placeholders, ",")))
	}

	if len(filter.ExcludeSources) > 0 {
		placeholders := make([]string, len(filter.ExcludeSources))
		for i, src := range filter.ExcludeSources {
			placeholders[i] = "?"
			args = append(args, src)
		}
		conditions = append(conditions, fmt.Sprintf("t.source NOT IN (%s)", strings.Join(placeholders, ",")))
	}

	if filter.IsPaid != nil {
		isPaid := 0
		if *filter.IsPaid {
			isPaid = 1
		}
		conditions = append(conditions, "t.is_paid = ?")
		args = append(args, isPaid)
	}

	if filter.DateFrom != nil {
		conditions = append(conditions, "t.transaction_date >= ?")
		args = append(args, *filter.DateFrom)
	}

	if filter.DateTo != nil {
		conditions = append(conditions, "t.transaction_date <= ?")
		args = append(args, *filter.DateTo)
	}

	if len(conditions) == 0 {
		return "", args
	}

	return " WHERE " + strings.Join(conditions, " AND "), args
}
