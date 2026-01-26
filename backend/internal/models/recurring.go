package models

type RecurringPattern struct {
	ID                 string   `json:"id"`
	Source             string   `json:"source"`
	Category           string   `json:"category"`
	DescriptionPattern *string  `json:"descriptionPattern"`
	AvgAmount          float64  `json:"avgAmount"`
	MinAmount          *float64 `json:"minAmount"`
	MaxAmount          *float64 `json:"maxAmount"`
	AmountVariance     *float64 `json:"amountVariance"`
	Frequency          *string  `json:"frequency"`
	AvgIntervalDays    *int     `json:"avgIntervalDays"`
	IntervalVariance   *float64 `json:"intervalVariance"`
	LastOccurrence     *string  `json:"lastOccurrence"`
	NextExpected       *string  `json:"nextExpected"`
	OccurrenceCount    int      `json:"occurrenceCount"`
	Confidence         float64  `json:"confidence"`
	DetectionMode      string   `json:"detectionMode"` // "temporal" or "similarity"
	IsConfirmed        *bool    `json:"isConfirmed"`
	UserLabel          *string  `json:"userLabel"`
	CreatedAt          int64    `json:"createdAt"`
	UpdatedAt          int64    `json:"updatedAt"`
}

type RecurringPatternWithTransactions struct {
	RecurringPattern
	Transactions []Transaction `json:"transactions"`
}

type RecurringSummary struct {
	TotalMonthly float64 `json:"totalMonthly"`
	TotalYearly  float64 `json:"totalYearly"`
	PatternCount int     `json:"patternCount"`
}

type RecurringResponse struct {
	Patterns []RecurringPattern `json:"patterns"`
	Summary  RecurringSummary   `json:"summary"`
}

type RecurringUpdateRequest struct {
	IsConfirmed *bool   `json:"isConfirmed"`
	UserLabel   *string `json:"userLabel"`
}

// Internal types for detection algorithm
type TransactionGroup struct {
	Source       string
	Category     string
	Transactions []Transaction
}
