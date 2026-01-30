# Kiro Finance

Personal finance dashboard for analyzing CSV transaction exports.

## Features

- **CSV Import** - Upload transaction CSV files (supports Polish bank formats)
- **Multi-file Support** - Load multiple files, select which to analyze
- **KPI Dashboard** - Total spent, paid/unpaid, cash transactions
- **Charts** - Pie chart by category (with drill-down to source), bar charts
- **Filtering** - Exclude categories/sources from calculations
- **Recurring Detection** - Automatic detection of subscriptions and recurring payments
- **Pagination** - Table with 20/50 records per page

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Nivo (charts)
- TanStack Table

**Backend:**
- Go 1.22 + Gin
- SQLite (with CGO)

## Quick Start

### Docker (recommended)

```bash
docker-compose up -d --build
```

App available at http://localhost:5300

### Development

**Backend:**
```bash
cd backend
cp config.json.example config.json
go run ./cmd/server
```

**Frontend:**
```bash
npm install
npm run dev
```

Create `.env.local` for dev:
```
VITE_API_URL=http://localhost:8080/api
```

## CSV Format

Expected format (Polish bank export):
- First 3 rows: metadata (skipped)
- Row 4: headers
- Columns: `Rodzaj`, `Skąd`, `Co`, `Za ile`, `Opłacone?`, `Gotówka`, `Data` (optional)

Example:
```csv
...metadata...
...metadata...
...metadata...
Rodzaj,Skąd,Co,Za ile,Opłacone?,Gotówka,Data
Rozrywka,Netflix,Subskrypcja,"49,00 zł",✅,,2024-01-15
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List uploaded files |
| POST | `/api/files` | Upload CSV file |
| DELETE | `/api/files/:id` | Delete file |
| GET | `/api/transactions` | Get transactions (with filters) |
| GET | `/api/stats/summary` | Payment summary |
| GET | `/api/stats/categories` | Category totals |
| GET | `/api/recurring` | Detected recurring patterns |
| POST | `/api/recurring/recalculate` | Force pattern recalculation |

## Project Structure

```
├── backend/
│   ├── cmd/server/         # Entry point
│   ├── internal/
│   │   ├── api/            # HTTP handlers & routes
│   │   ├── db/             # SQLite connection
│   │   ├── models/         # Data models
│   │   ├── parser/         # CSV parser
│   │   └── services/       # Business logic
│   └── Dockerfile
├── src/
│   ├── api/                # API client
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── types/              # TypeScript types
│   └── utils/              # Utilities
├── docker-compose.yaml
└── Dockerfile              # Frontend
```

## License

MIT
