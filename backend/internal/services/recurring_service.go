package services

import (
	"log"
	"math"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"kiro-finance-backend/internal/db"
	"kiro-finance-backend/internal/models"
)

var recurringMutex sync.Mutex
var recurringInProgress bool

// TriggerRecurringDetection starts async detection if not already running
func TriggerRecurringDetection() {
	recurringMutex.Lock()
	if recurringInProgress {
		recurringMutex.Unlock()
		return
	}
	recurringInProgress = true
	recurringMutex.Unlock()

	go func() {
		defer func() {
			recurringMutex.Lock()
			recurringInProgress = false
			recurringMutex.Unlock()
		}()

		if err := DetectRecurringPatterns(); err != nil {
			log.Printf("Recurring detection error: %v", err)
		}
	}()
}

// GetRecurringPatterns returns all patterns with optional filtering
func GetRecurringPatterns(minConfidence float64, confirmedOnly, includeRejected bool) (*models.RecurringResponse, error) {
	query := `
		SELECT id, source, category, description_pattern, avg_amount, min_amount, max_amount,
		       amount_variance, frequency, avg_interval_days, interval_variance, last_occurrence,
		       next_expected, occurrence_count, confidence, detection_mode, is_confirmed, user_label,
		       created_at, updated_at
		FROM recurring_patterns
		WHERE confidence >= ?
	`
	args := []interface{}{minConfidence}

	if confirmedOnly {
		query += " AND is_confirmed = 1"
	}
	if !includeRejected {
		query += " AND (is_confirmed IS NULL OR is_confirmed = 1)"
	}

	query += " ORDER BY confidence DESC"

	rows, err := db.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var patterns []models.RecurringPattern
	var totalMonthly, totalYearly float64

	for rows.Next() {
		var p models.RecurringPattern
		var isConfirmed *int

		err := rows.Scan(
			&p.ID, &p.Source, &p.Category, &p.DescriptionPattern, &p.AvgAmount,
			&p.MinAmount, &p.MaxAmount, &p.AmountVariance, &p.Frequency,
			&p.AvgIntervalDays, &p.IntervalVariance, &p.LastOccurrence,
			&p.NextExpected, &p.OccurrenceCount, &p.Confidence, &p.DetectionMode,
			&isConfirmed, &p.UserLabel, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if isConfirmed != nil {
			val := *isConfirmed == 1
			p.IsConfirmed = &val
		}

		patterns = append(patterns, p)

		// Calculate monthly/yearly totals
		if p.Frequency != nil {
			switch *p.Frequency {
			case "weekly":
				totalMonthly += p.AvgAmount * 4.33
				totalYearly += p.AvgAmount * 52
			case "biweekly":
				totalMonthly += p.AvgAmount * 2.17
				totalYearly += p.AvgAmount * 26
			case "monthly":
				totalMonthly += p.AvgAmount
				totalYearly += p.AvgAmount * 12
			case "quarterly":
				totalMonthly += p.AvgAmount / 3
				totalYearly += p.AvgAmount * 4
			case "yearly":
				totalMonthly += p.AvgAmount / 12
				totalYearly += p.AvgAmount
			}
		}
	}

	return &models.RecurringResponse{
		Patterns: patterns,
		Summary: models.RecurringSummary{
			TotalMonthly: math.Round(totalMonthly*100) / 100,
			TotalYearly:  math.Round(totalYearly*100) / 100,
			PatternCount: len(patterns),
		},
	}, nil
}

// GetRecurringPatternByID returns a single pattern with its transactions
func GetRecurringPatternByID(id string) (*models.RecurringPatternWithTransactions, error) {
	var p models.RecurringPattern
	var isConfirmed *int

	err := db.DB.QueryRow(`
		SELECT id, source, category, description_pattern, avg_amount, min_amount, max_amount,
		       amount_variance, frequency, avg_interval_days, interval_variance, last_occurrence,
		       next_expected, occurrence_count, confidence, detection_mode, is_confirmed, user_label,
		       created_at, updated_at
		FROM recurring_patterns WHERE id = ?
	`, id).Scan(
		&p.ID, &p.Source, &p.Category, &p.DescriptionPattern, &p.AvgAmount,
		&p.MinAmount, &p.MaxAmount, &p.AmountVariance, &p.Frequency,
		&p.AvgIntervalDays, &p.IntervalVariance, &p.LastOccurrence,
		&p.NextExpected, &p.OccurrenceCount, &p.Confidence, &p.DetectionMode,
		&isConfirmed, &p.UserLabel, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if isConfirmed != nil {
		val := *isConfirmed == 1
		p.IsConfirmed = &val
	}

	// Get associated transactions
	rows, err := db.DB.Query(`
		SELECT t.id, t.file_id, t.category, t.source, t.description, t.amount,
		       t.amount_original, t.is_paid, t.is_cash, t.transaction_date, t.created_at
		FROM transactions t
		JOIN recurring_transactions rt ON t.id = rt.transaction_id
		WHERE rt.pattern_id = ?
		ORDER BY t.transaction_date DESC, t.created_at DESC
	`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var t models.Transaction
		var isPaid int
		err := rows.Scan(&t.ID, &t.FileID, &t.Category, &t.Source, &t.Description,
			&t.Amount, &t.AmountOriginal, &isPaid, &t.IsCash, &t.TransactionDate, &t.CreatedAt)
		if err != nil {
			return nil, err
		}
		t.IsPaid = isPaid == 1
		transactions = append(transactions, t)
	}

	return &models.RecurringPatternWithTransactions{
		RecurringPattern: p,
		Transactions:     transactions,
	}, nil
}

// UpdateRecurringPattern updates user confirmation and label
func UpdateRecurringPattern(id string, req models.RecurringUpdateRequest) error {
	var setClauses []string
	var args []interface{}

	if req.IsConfirmed != nil {
		val := 0
		if *req.IsConfirmed {
			val = 1
		}
		setClauses = append(setClauses, "is_confirmed = ?")
		args = append(args, val)
	}

	if req.UserLabel != nil {
		setClauses = append(setClauses, "user_label = ?")
		args = append(args, *req.UserLabel)
	}

	if len(setClauses) == 0 {
		return nil
	}

	setClauses = append(setClauses, "updated_at = ?")
	args = append(args, time.Now().Unix())
	args = append(args, id)

	query := "UPDATE recurring_patterns SET " + strings.Join(setClauses, ", ") + " WHERE id = ?"
	_, err := db.DB.Exec(query, args...)
	return err
}

// DeleteRecurringPattern marks pattern as rejected
func DeleteRecurringPattern(id string) error {
	_, err := db.DB.Exec(`
		UPDATE recurring_patterns SET is_confirmed = 0, updated_at = ? WHERE id = ?
	`, time.Now().Unix(), id)
	return err
}

// DetectRecurringPatterns runs the detection algorithm on all transactions
func DetectRecurringPatterns() error {
	// Get all transactions
	rows, err := db.DB.Query(`
		SELECT id, file_id, category, source, description, amount, amount_original,
		       is_paid, is_cash, transaction_date, created_at
		FROM transactions
		ORDER BY source, category, transaction_date
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var transactions []models.Transaction
	for rows.Next() {
		var t models.Transaction
		var isPaid int
		err := rows.Scan(&t.ID, &t.FileID, &t.Category, &t.Source, &t.Description,
			&t.Amount, &t.AmountOriginal, &isPaid, &t.IsCash, &t.TransactionDate, &t.CreatedAt)
		if err != nil {
			return err
		}
		t.IsPaid = isPaid == 1
		transactions = append(transactions, t)
	}

	// Group transactions
	groups := groupTransactions(transactions)

	// Detect patterns
	patterns := detectPatterns(groups)

	// Save patterns (preserve confirmed ones)
	return savePatterns(patterns)
}

func groupTransactions(transactions []models.Transaction) []models.TransactionGroup {
	groupMap := make(map[string]*models.TransactionGroup)

	for _, t := range transactions {
		key := t.Source + "|" + t.Category
		if g, ok := groupMap[key]; ok {
			g.Transactions = append(g.Transactions, t)
		} else {
			groupMap[key] = &models.TransactionGroup{
				Source:       t.Source,
				Category:     t.Category,
				Transactions: []models.Transaction{t},
			}
		}
	}

	var groups []models.TransactionGroup
	for _, g := range groupMap {
		if len(g.Transactions) >= 2 {
			groups = append(groups, *g)
		}
	}

	return groups
}

func detectPatterns(groups []models.TransactionGroup) []models.RecurringPattern {
	var patterns []models.RecurringPattern
	now := time.Now().Unix()

	for _, g := range groups {
		// Calculate amount statistics
		amounts := make([]float64, len(g.Transactions))
		for i, t := range g.Transactions {
			amounts[i] = t.Amount
		}

		avgAmount := average(amounts)
		minAmount := min(amounts)
		maxAmount := max(amounts)
		amountVariance := stdDev(amounts)

		// Check if amounts are similar enough (within 20% of average)
		if amountVariance/avgAmount > 0.2 {
			// Too much variance, might need to split into subgroups
			// For now, skip if variance is too high
			continue
		}

		// Find common description pattern
		descPattern := findCommonSubstring(g.Transactions)

		// Check for temporal patterns (if dates available)
		var frequency *string
		var avgIntervalDays *int
		var intervalVariance *float64
		var lastOccurrence *string
		var nextExpected *string
		var confidence float64
		detectionMode := "similarity"

		datesAvailable := countDates(g.Transactions)
		if datesAvailable >= 2 {
			// Sort by date
			sortedTx := sortByDate(g.Transactions)
			intervals := calculateIntervals(sortedTx)

			if len(intervals) > 0 {
				avgInt := int(average(toFloat64(intervals)))
				intVar := stdDev(toFloat64(intervals))

				// Classify frequency
				freq := classifyFrequency(avgInt)
				if freq != "" {
					frequency = &freq
					avgIntervalDays = &avgInt
					intervalVariance = &intVar

					// Calculate confidence based on interval consistency
					if avgInt > 0 {
						confidence = 1.0 - (intVar / float64(avgInt))
						if confidence < 0 {
							confidence = 0
						}
					}
					detectionMode = "temporal"

					// Set last occurrence and predict next
					if sortedTx[len(sortedTx)-1].TransactionDate != nil {
						last := *sortedTx[len(sortedTx)-1].TransactionDate
						lastOccurrence = &last

						// Predict next
						lastDate, err := time.Parse("2006-01-02", last)
						if err == nil {
							nextDate := lastDate.AddDate(0, 0, avgInt)
							next := nextDate.Format("2006-01-02")
							nextExpected = &next
						}
					}
				}
			}
		}

		// Fallback to similarity-based confidence
		if detectionMode == "similarity" {
			// Confidence based on occurrence count and amount consistency
			countFactor := math.Min(float64(len(g.Transactions))/10.0, 1.0)
			varianceFactor := 1.0 - (amountVariance / avgAmount)
			if varianceFactor < 0 {
				varianceFactor = 0
			}
			confidence = countFactor * varianceFactor * 0.7 // Cap at 0.7 for similarity-only
		}

		// Skip low confidence patterns
		if confidence < 0.3 {
			continue
		}

		pattern := models.RecurringPattern{
			ID:                 uuid.New().String(),
			Source:             g.Source,
			Category:           g.Category,
			DescriptionPattern: descPattern,
			AvgAmount:          math.Round(avgAmount*100) / 100,
			MinAmount:          &minAmount,
			MaxAmount:          &maxAmount,
			AmountVariance:     &amountVariance,
			Frequency:          frequency,
			AvgIntervalDays:    avgIntervalDays,
			IntervalVariance:   intervalVariance,
			LastOccurrence:     lastOccurrence,
			NextExpected:       nextExpected,
			OccurrenceCount:    len(g.Transactions),
			Confidence:         math.Round(confidence*100) / 100,
			DetectionMode:      detectionMode,
			CreatedAt:          now,
			UpdatedAt:          now,
		}

		patterns = append(patterns, pattern)
	}

	return patterns
}

func savePatterns(patterns []models.RecurringPattern) error {
	tx, err := db.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get existing confirmed patterns
	confirmedMap := make(map[string]bool)
	rows, err := tx.Query("SELECT source, category FROM recurring_patterns WHERE is_confirmed = 1")
	if err == nil {
		for rows.Next() {
			var source, category string
			rows.Scan(&source, &category)
			confirmedMap[source+"|"+category] = true
		}
		rows.Close()
	}

	// Delete non-confirmed patterns
	_, err = tx.Exec("DELETE FROM recurring_patterns WHERE is_confirmed IS NULL OR is_confirmed = 0")
	if err != nil {
		return err
	}

	// Delete orphaned recurring_transactions
	_, _ = tx.Exec("DELETE FROM recurring_transactions WHERE pattern_id NOT IN (SELECT id FROM recurring_patterns)")

	// Insert new patterns (skip if confirmed version exists)
	for _, p := range patterns {
		key := p.Source + "|" + p.Category
		if confirmedMap[key] {
			// Update stats for confirmed pattern instead
			_, err = tx.Exec(`
				UPDATE recurring_patterns 
				SET avg_amount = ?, min_amount = ?, max_amount = ?, amount_variance = ?,
				    frequency = ?, avg_interval_days = ?, interval_variance = ?,
				    last_occurrence = ?, next_expected = ?, occurrence_count = ?,
				    confidence = ?, updated_at = ?
				WHERE source = ? AND category = ? AND is_confirmed = 1
			`, p.AvgAmount, p.MinAmount, p.MaxAmount, p.AmountVariance,
				p.Frequency, p.AvgIntervalDays, p.IntervalVariance,
				p.LastOccurrence, p.NextExpected, p.OccurrenceCount,
				p.Confidence, p.UpdatedAt, p.Source, p.Category)
			continue
		}

		_, err = tx.Exec(`
			INSERT INTO recurring_patterns (
				id, source, category, description_pattern, avg_amount, min_amount, max_amount,
				amount_variance, frequency, avg_interval_days, interval_variance, last_occurrence,
				next_expected, occurrence_count, confidence, detection_mode, created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, p.ID, p.Source, p.Category, p.DescriptionPattern, p.AvgAmount, p.MinAmount, p.MaxAmount,
			p.AmountVariance, p.Frequency, p.AvgIntervalDays, p.IntervalVariance, p.LastOccurrence,
			p.NextExpected, p.OccurrenceCount, p.Confidence, p.DetectionMode, p.CreatedAt, p.UpdatedAt)
		if err != nil {
			return err
		}

		// Link transactions to pattern
		txRows, _ := tx.Query(`SELECT id FROM transactions WHERE source = ? AND category = ?`, p.Source, p.Category)
		if txRows != nil {
			var txIDs []string
			for txRows.Next() {
				var txID string
				txRows.Scan(&txID)
				txIDs = append(txIDs, txID)
			}
			txRows.Close()

			for _, txID := range txIDs {
				tx.Exec("INSERT OR IGNORE INTO recurring_transactions (pattern_id, transaction_id) VALUES (?, ?)", p.ID, txID)
			}
		}
	}

	return tx.Commit()
}

// Helper functions
func average(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	sum := 0.0
	for _, n := range nums {
		sum += n
	}
	return sum / float64(len(nums))
}

func stdDev(nums []float64) float64 {
	if len(nums) < 2 {
		return 0
	}
	avg := average(nums)
	sumSq := 0.0
	for _, n := range nums {
		sumSq += (n - avg) * (n - avg)
	}
	return math.Sqrt(sumSq / float64(len(nums)))
}

func min(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	m := nums[0]
	for _, n := range nums {
		if n < m {
			m = n
		}
	}
	return m
}

func max(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	m := nums[0]
	for _, n := range nums {
		if n > m {
			m = n
		}
	}
	return m
}

func countDates(transactions []models.Transaction) int {
	count := 0
	for _, t := range transactions {
		if t.TransactionDate != nil && *t.TransactionDate != "" {
			count++
		}
	}
	return count
}

func sortByDate(transactions []models.Transaction) []models.Transaction {
	sorted := make([]models.Transaction, len(transactions))
	copy(sorted, transactions)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].TransactionDate == nil {
			return false
		}
		if sorted[j].TransactionDate == nil {
			return true
		}
		return *sorted[i].TransactionDate < *sorted[j].TransactionDate
	})
	return sorted
}

func calculateIntervals(transactions []models.Transaction) []int {
	var intervals []int
	for i := 1; i < len(transactions); i++ {
		if transactions[i-1].TransactionDate == nil || transactions[i].TransactionDate == nil {
			continue
		}
		d1, err1 := time.Parse("2006-01-02", *transactions[i-1].TransactionDate)
		d2, err2 := time.Parse("2006-01-02", *transactions[i].TransactionDate)
		if err1 != nil || err2 != nil {
			continue
		}
		days := int(d2.Sub(d1).Hours() / 24)
		if days > 0 {
			intervals = append(intervals, days)
		}
	}
	return intervals
}

func toFloat64(ints []int) []float64 {
	result := make([]float64, len(ints))
	for i, v := range ints {
		result[i] = float64(v)
	}
	return result
}

func classifyFrequency(avgDays int) string {
	switch {
	case avgDays >= 5 && avgDays <= 9:
		return "weekly"
	case avgDays >= 12 && avgDays <= 16:
		return "biweekly"
	case avgDays >= 25 && avgDays <= 35:
		return "monthly"
	case avgDays >= 85 && avgDays <= 95:
		return "quarterly"
	case avgDays >= 350 && avgDays <= 380:
		return "yearly"
	case avgDays > 0:
		return "irregular"
	default:
		return ""
	}
}

func findCommonSubstring(transactions []models.Transaction) *string {
	if len(transactions) == 0 {
		return nil
	}

	// Simple approach: find longest common prefix
	first := transactions[0].Description
	for _, t := range transactions[1:] {
		for len(first) > 0 && !strings.HasPrefix(t.Description, first) {
			first = first[:len(first)-1]
		}
	}

	first = strings.TrimSpace(first)
	if len(first) < 3 {
		return nil
	}
	return &first
}
