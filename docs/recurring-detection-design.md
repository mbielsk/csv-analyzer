# Recurring Detection - Design Document

## Overview

System automatycznego wykrywania powtarzających się transakcji (subskrypcje, rachunki, regularne płatności). Działa na transakcjach z datami, ale gracefully degraduje gdy dat brak.

## Założenia

1. **Daty są opcjonalne** - algorytm musi działać w dwóch trybach:
   - Z datami: pełna analiza interwałów czasowych
   - Bez dat: analiza tylko po podobieństwie (source, category, amount)

2. **Przeliczanie przy zmianach** - usunięcie pliku/transakcji triggeruje rekalkulację patterns

3. **Confidence scoring** - każdy pattern ma poziom pewności (0.0-1.0)

4. **User confirmation** - user może potwierdzić/odrzucić wykryty pattern

## Schemat bazy danych

### Tabela: recurring_patterns

```sql
CREATE TABLE recurring_patterns (
    id TEXT PRIMARY KEY,
    
    -- Klucz grupowania
    source TEXT NOT NULL,
    category TEXT NOT NULL,
    description_pattern TEXT,      -- wspólny substring opisów
    
    -- Statystyki kwot
    avg_amount REAL NOT NULL,
    min_amount REAL,
    max_amount REAL,
    amount_variance REAL,          -- odchylenie standardowe kwot
    
    -- Analiza czasowa (nullable - gdy brak dat)
    frequency TEXT,                -- 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'irregular', NULL
    avg_interval_days INTEGER,     -- średni interwał w dniach
    interval_variance REAL,        -- odchylenie standardowe interwałów
    
    -- Predykcja (nullable)
    last_occurrence TEXT,          -- data ostatniej transakcji (yyyy-MM-dd)
    next_expected TEXT,            -- przewidywana następna data
    
    -- Metadata
    occurrence_count INTEGER NOT NULL,  -- ile razy wystąpiło
    confidence REAL NOT NULL,           -- 0.0-1.0
    detection_mode TEXT NOT NULL,       -- 'temporal' lub 'similarity'
    
    -- User feedback
    is_confirmed BOOLEAN DEFAULT NULL,  -- NULL=nie sprawdzone, true=potwierdzone, false=odrzucone
    user_label TEXT,                    -- własna nazwa usera np. "Netflix"
    
    -- Timestamps
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX idx_recurring_source ON recurring_patterns(source);
CREATE INDEX idx_recurring_category ON recurring_patterns(category);
CREATE INDEX idx_recurring_confidence ON recurring_patterns(confidence DESC);
```

### Tabela: recurring_transactions (junction)

```sql
CREATE TABLE recurring_transactions (
    pattern_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    PRIMARY KEY (pattern_id, transaction_id),
    FOREIGN KEY (pattern_id) REFERENCES recurring_patterns(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX idx_recurring_tx_pattern ON recurring_transactions(pattern_id);
CREATE INDEX idx_recurring_tx_transaction ON recurring_transactions(transaction_id);
```

## Algorytm wykrywania

### Faza 1: Grupowanie transakcji

```
Input: wszystkie transakcje
Output: grupy kandydatów

1. Grupuj transakcje po kluczu (source, category)
2. Dla każdej grupy z >= 2 transakcjami:
   a. Oblicz podobieństwo kwot (czy są w zakresie ±10%)
   b. Znajdź wspólny substring w opisach (LCS)
   c. Podziel na podgrupy jeśli kwoty znacząco różne
```

### Faza 2: Analiza temporalna (gdy są daty)

```
Input: grupa transakcji z datami
Output: frequency, avg_interval, confidence

1. Posortuj transakcje po dacie
2. Oblicz interwały między kolejnymi transakcjami
3. Oblicz średnią i odchylenie standardowe interwałów
4. Klasyfikuj frequency:
   - 5-9 dni → weekly
   - 12-16 dni → biweekly  
   - 25-35 dni → monthly
   - 85-95 dni → quarterly
   - 350-380 dni → yearly
   - inne → irregular
5. Confidence = 1.0 - (stdDev / avgInterval), min 0.0
6. Jeśli confidence < 0.3 → odrzuć jako nie-recurring
```

### Faza 3: Analiza similarity-only (gdy brak dat)

```
Input: grupa transakcji bez dat
Output: pattern z detection_mode='similarity'

1. Oblicz statystyki kwot (avg, min, max, variance)
2. Confidence bazuje na:
   - Liczbie wystąpień (więcej = lepiej)
   - Spójności kwot (mniejsza wariancja = lepiej)
   - Podobieństwie opisów
3. Formula: confidence = min(occurrence_count/10, 1.0) * (1.0 - amount_variance/avg_amount)
4. Jeśli confidence < 0.2 → odrzuć
```

### Faza 4: Predykcja następnej daty

```
Input: pattern z frequency != NULL
Output: next_expected date

1. Weź last_occurrence
2. Dodaj avg_interval_days
3. Jeśli frequency='monthly' → użyj tego samego dnia miesiąca
4. Zapisz jako next_expected
```

## Przeliczanie patterns

### Triggery

1. **Upload pliku** → dodaj nowe transakcje do analizy
2. **Usunięcie pliku** → usuń transakcje, przelicz patterns
3. **Usunięcie transakcji** → przelicz affected patterns
4. **User confirmation** → nie przeliczaj confirmed patterns automatycznie

### Strategia przeliczania

```
1. Przy usunięciu pliku/transakcji:
   a. Znajdź affected patterns (przez recurring_transactions)
   b. Dla każdego affected pattern:
      - Jeśli is_confirmed=true → zachowaj, tylko zaktualizuj statystyki
      - Jeśli is_confirmed=false → usuń pattern
      - Jeśli is_confirmed=NULL → przelicz od nowa
   c. Usuń patterns z occurrence_count < 2

2. Przy dodaniu transakcji:
   a. Uruchom pełny algorytm wykrywania
   b. Merge z istniejącymi patterns (nie duplikuj)
   c. Zaktualizuj statystyki existing patterns
```

## API Endpoints

### GET /api/recurring

Lista wykrytych patterns.

Query params:
- `min_confidence` (float, default 0.5)
- `confirmed_only` (bool)
- `include_rejected` (bool, default false)

Response:
```json
{
  "patterns": [
    {
      "id": "uuid",
      "source": "Netflix",
      "category": "Rozrywka",
      "descriptionPattern": "Netflix subscription",
      "avgAmount": 49.00,
      "frequency": "monthly",
      "avgIntervalDays": 30,
      "lastOccurrence": "2024-01-15",
      "nextExpected": "2024-02-15",
      "occurrenceCount": 12,
      "confidence": 0.95,
      "detectionMode": "temporal",
      "isConfirmed": true,
      "userLabel": "Netflix"
    }
  ],
  "summary": {
    "totalMonthly": 450.00,
    "totalYearly": 5400.00,
    "patternCount": 8
  }
}
```

### GET /api/recurring/:id

Szczegóły pattern z listą transakcji.

### PUT /api/recurring/:id

Update pattern (confirmation, label).

```json
{
  "isConfirmed": true,
  "userLabel": "Spotify Family"
}
```

### POST /api/recurring/recalculate

Force recalculation wszystkich patterns.

### DELETE /api/recurring/:id

Usuń pattern (oznacz jako rejected, nie usuwaj z DB).

## UI Components

### RecurringPanel

Rozwijany panel w Dashboard pokazujący:
- Lista wykrytych subskrypcji/recurring
- Suma miesięczna/roczna recurring costs
- Upcoming payments (next 7/30 dni)

### RecurringCard

Pojedynczy pattern:
- Source + Category
- Kwota (avg lub range)
- Frequency badge (Monthly, Weekly, etc.)
- Confidence indicator (progress bar lub %)
- Confirm/Reject buttons
- Edit label

### TransactionBadge

Badge przy transakcji w tabeli jeśli należy do recurring pattern.

## Edge Cases

1. **Transakcja bez daty w grupie z datami**
   - Wyklucz z analizy temporalnej
   - Uwzględnij w statystykach kwot

2. **Wszystkie transakcje bez dat**
   - Użyj tylko similarity detection
   - Niższy confidence cap (max 0.7)

3. **Jedna transakcja w grupie**
   - Nie twórz pattern
   - Zapamiętaj jako "potential" do przyszłej analizy

4. **Duża wariancja kwot**
   - Może to być ta sama usługa z różnymi planami
   - Podziel na podgrupy lub oznacz jako "variable amount"

5. **Nieregularne interwały**
   - frequency='irregular'
   - Nadal pokazuj jako recurring jeśli confidence > 0.5

6. **User odrzucił pattern, ale pojawiły się nowe transakcje**
   - Nie reaktywuj automatycznie
   - Opcjonalnie: pokaż notyfikację "Czy chcesz ponownie rozważyć?"

## Implementacja - kolejność

1. **Backend: Schema + migrations**
2. **Backend: Detection algorithm (core logic)**
3. **Backend: API endpoints**
4. **Backend: Recalculation triggers (w file_service)**
5. **Frontend: RecurringPanel component**
6. **Frontend: Integration z Dashboard**
7. **Frontend: TransactionBadge**
8. **Testing: Edge cases**

## Metryki sukcesu

- Precision: % wykrytych patterns które są prawdziwe recurring
- Recall: % prawdziwych recurring które zostały wykryte
- User confirmation rate: ile patterns user potwierdza vs odrzuca
