# Backend Design: Kiro Finance API

## Overview

Backend w Go z SQLite jako bazą danych. REST API do zarządzania plikami i transakcjami.

## Architektura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React App     │────▶│   Go Backend    │────▶│    SQLite       │
│   (Frontend)    │◀────│   (REST API)    │◀────│   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        :5173                 :8080               finance.db
```

## Schemat bazy danych (SQLite)

### Tabela: files

```sql
CREATE TABLE files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    uploaded_at INTEGER NOT NULL,  -- Unix timestamp
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX idx_files_name ON files(name);
```

### Tabela: transactions

```sql
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    category TEXT NOT NULL,              -- Rodzaj
    source TEXT NOT NULL,                -- Skąd
    description TEXT NOT NULL,           -- Co
    amount REAL NOT NULL,                -- Za ile (normalized)
    amount_original TEXT NOT NULL,       -- Original amount string
    is_paid INTEGER NOT NULL DEFAULT 0,  -- 0 or 1 (boolean)
    is_cash TEXT,                        -- Gotówka
    transaction_date TEXT,               -- yyyy-MM-dd (nullable)
    created_at INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_file_id ON transactions(file_id);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_source ON transactions(source);
CREATE INDEX idx_transactions_is_paid ON transactions(is_paid);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
```

### Tabela: categories (opcjonalna, dla przyszłych ficzerów)

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    icon TEXT,
    created_at INTEGER NOT NULL
);
```

### Tabela: sources (opcjonalna, dla przyszłych ficzerów)

```sql
CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    url TEXT,
    created_at INTEGER NOT NULL
);
```

## REST API Endpoints

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | Lista wszystkich plików |
| GET | `/api/files/:id` | Szczegóły pliku |
| POST | `/api/files` | Upload nowego pliku (multipart/form-data) |
| PUT | `/api/files/:id` | Reimport pliku (nadpisuje transakcje) |
| DELETE | `/api/files/:id` | Usuń plik i jego transakcje |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | Lista transakcji (z filtrami i paginacją) |
| GET | `/api/transactions/:id` | Szczegóły transakcji |
| PUT | `/api/transactions/:id` | Edycja transakcji |
| DELETE | `/api/transactions/:id` | Usuń transakcję |

#### GET `/api/transactions` - Query Parameters

**Filtering:**
| Param | Type | Description |
|-------|------|-------------|
| `file_ids` | string | Comma-separated list of file IDs |
| `file_names` | string | Comma-separated list of file names (partial match) |
| `exclude_categories` | string | Comma-separated categories to exclude |
| `exclude_sources` | string | Comma-separated sources to exclude |
| `is_paid` | string | `true`, `false`, or empty for all |
| `date_from` | string | Start date (yyyy-MM-dd) |
| `date_to` | string | End date (yyyy-MM-dd) |

**Pagination:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number (1-indexed) |
| `per_page` | int | 50 | Items per page (max 500) |

**Sorting:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort_by` | string | `created_at` | Column to sort by |
| `sort_order` | string | `desc` | `asc` or `desc` |

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total_items": 1234,
    "total_pages": 25
  }
}
```

### Aggregations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/summary` | PaymentSummary (total, paid, unpaid) |
| GET | `/api/stats/categories` | CategoryTotal[] |
| GET | `/api/stats/sources` | SourceTotal[] |
| GET | `/api/stats/top-category` | Top category |

Query params (same filters as transactions, without pagination):
- `file_ids`, `file_names`, `exclude_categories`, `exclude_sources`, `is_paid`, `date_from`, `date_to`

## Struktura projektu Go

```
backend/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── api/
│   │   ├── handlers.go       # HTTP handlers
│   │   ├── middleware.go     # CORS, logging
│   │   └── routes.go         # Router setup
│   ├── db/
│   │   ├── sqlite.go         # DB connection
│   │   ├── migrations.go     # Schema migrations
│   │   └── queries.go        # SQL queries
│   ├── models/
│   │   ├── file.go           # File model
│   │   └── transaction.go    # Transaction model
│   ├── services/
│   │   ├── file_service.go   # File business logic
│   │   ├── transaction_service.go
│   │   └── stats_service.go  # Aggregations
│   └── parser/
│       └── csv_parser.go     # CSV parsing logic
├── go.mod
├── go.sum
└── Dockerfile
```

## Zależności Go

```go
// go.mod
module kiro-finance-backend

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1      // HTTP router
    github.com/mattn/go-sqlite3 v1.14.22 // SQLite driver
    github.com/google/uuid v1.6.0        // UUID generation
)
```

## Modele Go

```go
// models/file.go
type File struct {
    ID         string `json:"id"`
    Name       string `json:"name"`
    UploadedAt int64  `json:"uploadedAt"`
    CreatedAt  int64  `json:"createdAt"`
    UpdatedAt  int64  `json:"updatedAt"`
}

// models/transaction.go
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
    TransactionDate *string `json:"transactionDate"` // nullable, yyyy-MM-dd
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

type PaginatedResponse[T any] struct {
    Data       []T        `json:"data"`
    Pagination Pagination `json:"pagination"`
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
```

## Docker Compose (updated)

```yaml
services:
  frontend:
    build: .
    ports:
      - "5300:80"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data  # Persist SQLite database
    environment:
      - DB_PATH=/app/data/finance.db
```

## Migracja z localStorage

1. Frontend wykrywa dane w localStorage
2. Pokazuje prompt "Migrate to server?"
3. POST każdy plik do `/api/files`
4. Po sukcesie czyści localStorage

## Zmiany w Frontend

1. Nowy hook `useApi.ts` - fetch wrapper
2. Zmiana `useTransactions.ts` - zamiast localStorage, wywołania API
3. Dodanie loading states dla API calls
4. Error handling dla network errors
5. Mapowanie pól: `rodzaj` → `category`, `skad` → `source`, `co` → `description`, etc.

## Kolejność implementacji

1. **Backend base** - main.go, router, CORS
2. **Database** - SQLite connection, migrations
3. **File endpoints** - upload, list, delete
4. **Transaction endpoints** - list with filters and pagination
5. **Stats endpoints** - aggregations
6. **Frontend integration** - replace localStorage with API
7. **Migration tool** - localStorage → API

## Przyszłe rozszerzenia

- **Auth** - JWT tokens dla multi-user
- **Tags** - custom tags per transaction
- **Budgets** - limits per category
- **Recurring** - detect recurring transactions
- **Export** - PDF/Excel reports
- **Webhooks** - notify other apps on new data
- **Date parsing** - auto-detect date from CSV if column exists
