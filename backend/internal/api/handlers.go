package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"kiro-finance-backend/internal/models"
	"kiro-finance-backend/internal/parser"
	"kiro-finance-backend/internal/services"
)

// Files handlers

func GetFiles(c *gin.Context) {
	files, err := services.GetAllFiles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if files == nil {
		files = []models.File{}
	}

	c.JSON(http.StatusOK, files)
}

func GetFile(c *gin.Context) {
	id := c.Param("id")
	file, err := services.GetFileByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if file == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	c.JSON(http.StatusOK, file)
}

func UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	if !strings.HasSuffix(strings.ToLower(file.Filename), ".csv") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only CSV files are allowed"})
		return
	}

	// Create file record
	fileRecord, err := services.CreateFile(file.Filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Open and parse CSV
	f, err := file.Open()
	if err != nil {
		services.DeleteFile(fileRecord.ID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	transactions, err := parser.ParseCSV(f, fileRecord.ID)
	if err != nil {
		services.DeleteFile(fileRecord.ID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse CSV"})
		return
	}

	// Save transactions
	if err := services.SaveTransactions(transactions); err != nil {
		services.DeleteFile(fileRecord.ID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save transactions"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"file":             fileRecord,
		"transactionCount": len(transactions),
	})
}

func ReimportFile(c *gin.Context) {
	id := c.Param("id")

	existingFile, err := services.GetFileByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if existingFile == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	// Delete existing transactions
	if err := services.DeleteTransactionsByFileID(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse new CSV
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer f.Close()

	transactions, err := parser.ParseCSV(f, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse CSV"})
		return
	}

	// Save new transactions
	if err := services.SaveTransactions(transactions); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save transactions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file":             existingFile,
		"transactionCount": len(transactions),
	})
}

func DeleteFile(c *gin.Context) {
	id := c.Param("id")

	if err := services.DeleteFile(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted"})
}

// Transactions handlers

func GetTransactions(c *gin.Context) {
	filter := parseFilter(c)

	// Only use pagination if explicitly requested
	var page, perPage int
	if pageStr := c.Query("page"); pageStr != "" {
		page, _ = strconv.Atoi(pageStr)
	}
	if perPageStr := c.Query("per_page"); perPageStr != "" {
		perPage, _ = strconv.Atoi(perPageStr)
	}

	result, err := services.GetTransactions(filter, page, perPage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if result.Data == nil {
		result.Data = []models.Transaction{}
	}

	c.JSON(http.StatusOK, result)
}

func GetTransaction(c *gin.Context) {
	id := c.Param("id")

	tx, err := services.GetTransactionByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	c.JSON(http.StatusOK, tx)
}

func UpdateTransaction(c *gin.Context) {
	id := c.Param("id")

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Map JSON fields to DB columns
	dbUpdates := make(map[string]interface{})
	fieldMap := map[string]string{
		"category":        "category",
		"source":          "source",
		"description":     "description",
		"amount":          "amount",
		"isPaid":          "is_paid",
		"transactionDate": "transaction_date",
	}

	for jsonField, dbField := range fieldMap {
		if val, ok := updates[jsonField]; ok {
			if jsonField == "isPaid" {
				if boolVal, ok := val.(bool); ok {
					if boolVal {
						dbUpdates[dbField] = 1
					} else {
						dbUpdates[dbField] = 0
					}
				}
			} else {
				dbUpdates[dbField] = val
			}
		}
	}

	if err := services.UpdateTransaction(id, dbUpdates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaction updated"})
}

func DeleteTransaction(c *gin.Context) {
	id := c.Param("id")

	if err := services.DeleteTransaction(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaction deleted"})
}

// Stats handlers

func GetSummary(c *gin.Context) {
	filter := parseFilter(c)

	summary, err := services.GetPaymentSummary(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, summary)
}

func GetCategories(c *gin.Context) {
	filter := parseFilter(c)

	categories, err := services.GetCategoryTotals(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if categories == nil {
		categories = []models.CategoryTotal{}
	}

	c.JSON(http.StatusOK, categories)
}

func GetSources(c *gin.Context) {
	filter := parseFilter(c)

	sources, err := services.GetSourceTotals(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if sources == nil {
		sources = []models.SourceTotal{}
	}

	c.JSON(http.StatusOK, sources)
}

func GetTopCategory(c *gin.Context) {
	filter := parseFilter(c)

	topCategory, err := services.GetTopCategory(filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if topCategory == nil {
		c.JSON(http.StatusOK, nil)
		return
	}

	c.JSON(http.StatusOK, topCategory)
}

// Helper functions

func parseFilter(c *gin.Context) models.TransactionFilter {
	filter := models.TransactionFilter{}

	if fileIDs := c.Query("file_ids"); fileIDs != "" {
		filter.FileIDs = strings.Split(fileIDs, ",")
	}

	if fileNames := c.Query("file_names"); fileNames != "" {
		filter.FileNames = strings.Split(fileNames, ",")
	}

	if excludeCategories := c.Query("exclude_categories"); excludeCategories != "" {
		filter.ExcludeCategories = strings.Split(excludeCategories, ",")
	}

	if excludeSources := c.Query("exclude_sources"); excludeSources != "" {
		filter.ExcludeSources = strings.Split(excludeSources, ",")
	}

	if isPaid := c.Query("is_paid"); isPaid != "" {
		val := isPaid == "true"
		filter.IsPaid = &val
	}

	if dateFrom := c.Query("date_from"); dateFrom != "" {
		filter.DateFrom = &dateFrom
	}

	if dateTo := c.Query("date_to"); dateTo != "" {
		filter.DateTo = &dateTo
	}

	return filter
}

// Recurring handlers

func GetRecurringPatterns(c *gin.Context) {
	minConfidence := 0.5
	if mc := c.Query("min_confidence"); mc != "" {
		if val, err := strconv.ParseFloat(mc, 64); err == nil {
			minConfidence = val
		}
	}

	confirmedOnly := c.Query("confirmed_only") == "true"
	includeRejected := c.Query("include_rejected") == "true"

	result, err := services.GetRecurringPatterns(minConfidence, confirmedOnly, includeRejected)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if result.Patterns == nil {
		result.Patterns = []models.RecurringPattern{}
	}

	c.JSON(http.StatusOK, result)
}

func GetRecurringPattern(c *gin.Context) {
	id := c.Param("id")

	pattern, err := services.GetRecurringPatternByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pattern not found"})
		return
	}

	c.JSON(http.StatusOK, pattern)
}

func UpdateRecurringPattern(c *gin.Context) {
	id := c.Param("id")

	var req models.RecurringUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.UpdateRecurringPattern(id, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pattern updated"})
}

func DeleteRecurringPattern(c *gin.Context) {
	id := c.Param("id")

	if err := services.DeleteRecurringPattern(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pattern rejected"})
}

func RecalculateRecurring(c *gin.Context) {
	if err := services.DetectRecurringPatterns(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Patterns recalculated"})
}
