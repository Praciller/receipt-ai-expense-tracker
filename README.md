# Receipt AI Expense Tracker

Multimodal expense-tracking app that turns Thai/English receipt images into structured financial data, stores the result in Supabase, and visualizes spending patterns in a dashboard.

## Why This Project Matters

This project demonstrates practical AI engineering beyond a model demo:

- Vision-language extraction with Gemini 2.0 Flash
- Prompt design for strict JSON output and receipt-specific edge cases
- Thai Buddhist Era date conversion to Gregorian `YYYY-MM-DD`
- Supabase/PostgreSQL persistence with typed receipt records
- Analytics APIs for spending totals, category trends, top shops, and recent receipts
- Production-style Next.js UI with upload, review, history, and dashboard flows

## Core Features

- **AI receipt parsing:** uploads receipt images and extracts shop name, date, line items, total, tax ID, and category.
- **Thai and English support:** handles Thai receipt text and Buddhist Era year formats such as 2568 or 68.
- **Structured JSON pipeline:** validates Gemini output before storing records.
- **Expense analytics:** summarizes spending by period, category, shop, and recent activity.
- **Receipt management:** lists, filters, reviews, and deletes saved receipts.

## Tech Stack

| Area | Tools |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| AI | Google Gemini 2.0 Flash Vision, `@google/generative-ai` |
| Data | Supabase, PostgreSQL, JSONB |
| Charts | Recharts |
| UX | React Dropzone, Lucide React |

## Architecture

```text
Receipt image
  -> Next.js upload UI
  -> /api/receipts/parse
  -> Gemini Vision extraction prompt
  -> JSON validation and normalization
  -> Supabase receipts table
  -> Dashboard and history APIs
  -> Recharts analytics UI
```

## Key Implementation Details

- `src/lib/gemini.ts` defines the receipt extraction prompt and Gemini Vision call.
- `src/app/api/receipts/parse/route.ts` handles image parsing requests.
- `src/app/api/receipts/route.ts` manages receipt CRUD operations.
- `src/app/api/receipts/stats/route.ts` computes dashboard analytics.
- `src/components/dashboard.tsx` renders category, time-series, shop, and recent-receipt views.

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/Praciller/receipt-ai-expense-tracker.git
cd receipt-ai-expense-tracker
npm install
```

### 2. Configure environment

Create `.env.local`:

```bash
GEMINI_API_KEY=your_google_ai_studio_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get a Gemini key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Create the database table

Run the SQL in `supabase/schema.sql`, or create the core table manually:

```sql
CREATE TABLE receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_name TEXT,
  date DATE,
  items JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10, 2),
  tax_id TEXT,
  category TEXT,
  image_base64 TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supported Receipt Types

- Convenience stores and supermarkets
- Restaurants and cafes
- Tax invoices
- General shopping receipts
- Thai receipts using Buddhist Era dates

## AI Engineering Highlights

- Handles ambiguous OCR-like visual input with a deterministic JSON contract.
- Converts local Thai date conventions into database-friendly Gregorian dates.
- Uses typed API boundaries between AI extraction, storage, and analytics.
- Turns multimodal AI output into a full product workflow instead of a single prompt demo.

## License

MIT
