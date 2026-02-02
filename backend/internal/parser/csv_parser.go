package parser

import (
	"encoding/csv"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"kiro-finance-backend/internal/models"
)

const (
	skipRows  = 3
	headerRow = 4
)

var currencyRegex = regexp.MustCompile(`[złusdPLNUSDEUR€$]`)
var decimalEndRegex = regexp.MustCompile(`,\d{2}$`)

func ParseCSV(reader io.Reader, fileID string) ([]models.Transaction, error) {
	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1 // Allow variable fields

	var transactions []models.Transaction
	rowNum := 0
	var headers []string
	colIndex := make(map[string]int)

	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue // Skip malformed rows
		}

		rowNum++

		// Skip metadata rows
		if rowNum <= skipRows {
			continue
		}

		// Header row
		if rowNum == headerRow {
			headers = record
			for i, h := range headers {
				colIndex[strings.TrimSpace(h)] = i
			}
			continue
		}

		// Data rows
		if len(record) == 0 || isEmptyRow(record) {
			continue
		}

		tx := parseRow(record, colIndex, fileID)
		if tx != nil {
			transactions = append(transactions, *tx)
		}
	}

	return transactions, nil
}

func parseRow(record []string, colIndex map[string]int, fileID string) *models.Transaction {
	getValue := func(key string) string {
		if idx, ok := colIndex[key]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	amountOriginal := getValue("Za ile")
	amount := normalizeAmount(amountOriginal)
	if amount == nil {
		return nil
	}

	isPaid := strings.Contains(getValue("Opłacone?"), "✅")

	var transactionDate *string
	if dateStr := getValue("Data"); dateStr != "" {
		if parsed := parseDate(dateStr); parsed != "" {
			transactionDate = &parsed
		}
	}

	return &models.Transaction{
		ID:              uuid.New().String(),
		FileID:          fileID,
		Category:        getValue("Rodzaj"),
		Source:          getValue("Skąd"),
		Description:     getValue("Co"),
		Amount:          *amount,
		AmountOriginal:  amountOriginal,
		IsPaid:          isPaid,
		Bank:            getValue("Bank"),
		TransactionDate: transactionDate,
		CreatedAt:       time.Now().Unix(),
	}
}

func normalizeAmount(value string) *float64 {
	if value == "" {
		return nil
	}

	// Remove currency symbols and whitespace
	cleaned := currencyRegex.ReplaceAllString(value, "")
	cleaned = strings.ReplaceAll(cleaned, " ", "")
	cleaned = strings.TrimSpace(cleaned)

	if cleaned == "" {
		return nil
	}

	// Handle European format: "1,092.00" or "1.092,00"
	hasComma := strings.Contains(cleaned, ",")
	hasDot := strings.Contains(cleaned, ".")

	if hasComma && hasDot {
		lastComma := strings.LastIndex(cleaned, ",")
		lastDot := strings.LastIndex(cleaned, ".")

		if lastComma > lastDot {
			// Format: 1.092,00 (European with dot as thousands)
			cleaned = strings.ReplaceAll(cleaned, ".", "")
			cleaned = strings.Replace(cleaned, ",", ".", 1)
		} else {
			// Format: 1,092.00 (comma as thousands separator)
			cleaned = strings.ReplaceAll(cleaned, ",", "")
		}
	} else if hasComma {
		// Only comma - check if decimal (,XX at end) or thousands separator
		if decimalEndRegex.MatchString(cleaned) {
			// Decimal separator: 123,45 -> 123.45
			cleaned = strings.Replace(cleaned, ",", ".", 1)
		} else {
			// Thousands separator: 1,234 -> 1234
			cleaned = strings.ReplaceAll(cleaned, ",", "")
		}
	}

	parsed, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return nil
	}

	return &parsed
}

func parseDate(dateStr string) string {
	formats := []string{
		"2006-01-02",
		"02-01-2006",
		"02/01/2006",
		"2006/01/02",
		"02.01.2006",
	}

	for _, format := range formats {
		if t, err := time.Parse(format, dateStr); err == nil {
			return t.Format("2006-01-02")
		}
	}

	return ""
}

func isEmptyRow(record []string) bool {
	for _, cell := range record {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}
