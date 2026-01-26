package services

import (
	"kiro-finance-backend/internal/db"
	"kiro-finance-backend/internal/models"
)

func GetPaymentSummary(filter models.TransactionFilter) (*models.PaymentSummary, error) {
	whereClause, args := buildWhereClause(filter)

	query := `
		SELECT 
			COALESCE(SUM(t.amount), 0) as total,
			COALESCE(SUM(CASE WHEN t.is_paid = 1 THEN t.amount ELSE 0 END), 0) as paid,
			COALESCE(SUM(CASE WHEN t.is_paid = 0 THEN t.amount ELSE 0 END), 0) as unpaid,
			COALESCE(SUM(CASE WHEN t.is_paid = 1 THEN 1 ELSE 0 END), 0) as paid_count,
			COALESCE(SUM(CASE WHEN t.is_paid = 0 THEN 1 ELSE 0 END), 0) as unpaid_count
		FROM transactions t
		LEFT JOIN files f ON t.file_id = f.id
	` + whereClause

	var summary models.PaymentSummary
	err := db.DB.QueryRow(query, args...).Scan(
		&summary.TotalSpent,
		&summary.PaidAmount,
		&summary.UnpaidAmount,
		&summary.PaidCount,
		&summary.UnpaidCount,
	)

	if err != nil {
		return nil, err
	}

	return &summary, nil
}

func GetCategoryTotals(filter models.TransactionFilter) ([]models.CategoryTotal, error) {
	whereClause, args := buildWhereClause(filter)

	// First get total for percentage calculation
	totalQuery := `
		SELECT COALESCE(SUM(t.amount), 0)
		FROM transactions t
		LEFT JOIN files f ON t.file_id = f.id
	` + whereClause

	var total float64
	if err := db.DB.QueryRow(totalQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	query := `
		SELECT t.category, SUM(t.amount) as total, COUNT(*) as count
		FROM transactions t
		LEFT JOIN files f ON t.file_id = f.id
	` + whereClause + `
		GROUP BY t.category
		ORDER BY total DESC
	`

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []models.CategoryTotal
	for rows.Next() {
		var c models.CategoryTotal
		if err := rows.Scan(&c.Category, &c.Total, &c.Count); err != nil {
			return nil, err
		}
		if total > 0 {
			c.Percentage = (c.Total / total) * 100
		}
		categories = append(categories, c)
	}

	return categories, nil
}

func GetSourceTotals(filter models.TransactionFilter) ([]models.SourceTotal, error) {
	whereClause, args := buildWhereClause(filter)

	// First get total for percentage calculation
	totalQuery := `
		SELECT COALESCE(SUM(t.amount), 0)
		FROM transactions t
		LEFT JOIN files f ON t.file_id = f.id
	` + whereClause

	var total float64
	if err := db.DB.QueryRow(totalQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	query := `
		SELECT t.source, SUM(t.amount) as total, COUNT(*) as count
		FROM transactions t
		LEFT JOIN files f ON t.file_id = f.id
	` + whereClause + `
		GROUP BY t.source
		ORDER BY total DESC
	`

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sources []models.SourceTotal
	for rows.Next() {
		var s models.SourceTotal
		if err := rows.Scan(&s.Source, &s.Total, &s.Count); err != nil {
			return nil, err
		}
		if total > 0 {
			s.Percentage = (s.Total / total) * 100
		}
		sources = append(sources, s)
	}

	return sources, nil
}

func GetTopCategory(filter models.TransactionFilter) (*models.CategoryTotal, error) {
	categories, err := GetCategoryTotals(filter)
	if err != nil {
		return nil, err
	}

	if len(categories) == 0 {
		return nil, nil
	}

	return &categories[0], nil
}
