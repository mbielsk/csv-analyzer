package models

type Transaction struct {
	ID              string  `json:"id"`
	FileID          string  `json:"fileId"`
	Category        string  `json:"category"`
	Source          string  `json:"source"`
	Description     string  `json:"description"`
	Amount          float64 `json:"amount"`
	AmountOriginal  string  `json:"amountOriginal"`
	IsPaid          bool    `json:"isPaid"`
	IsCash          string  `json:"isCash"`
	TransactionDate *string `json:"transactionDate"`
	CreatedAt       int64   `json:"createdAt"`
}

type TransactionFilter struct {
	FileIDs           []string
	FileNames         []string
	ExcludeCategories []string
	ExcludeSources    []string
	IsPaid            *bool
	DateFrom          *string
	DateTo            *string
}

type Pagination struct {
	Page       int `json:"page"`
	PerPage    int `json:"perPage"`
	TotalItems int `json:"totalItems"`
	TotalPages int `json:"totalPages"`
}

type PaginatedTransactions struct {
	Data       []Transaction `json:"data"`
	Pagination Pagination    `json:"pagination"`
}

type PaymentSummary struct {
	TotalSpent   float64 `json:"totalSpent"`
	PaidAmount   float64 `json:"paidAmount"`
	UnpaidAmount float64 `json:"unpaidAmount"`
	PaidCount    int     `json:"paidCount"`
	UnpaidCount  int     `json:"unpaidCount"`
}

type CategoryTotal struct {
	Category   string  `json:"category"`
	Total      float64 `json:"total"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}

type SourceTotal struct {
	Source     string  `json:"source"`
	Total      float64 `json:"total"`
	Count      int     `json:"count"`
	Percentage float64 `json:"percentage"`
}
