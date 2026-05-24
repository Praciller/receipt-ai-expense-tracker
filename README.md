# Receipt AI Expense Tracker

Multimodal AI expense app that turns Thai/English receipt images into structured financial records, stores them in Supabase, and visualizes spending patterns in a dashboard.

Run locally with the setup below. Sample receipt images are included in `test-slip/` for parser testing and UI demos.

## Role Fit

| Target role | Evidence shown in this repo |
| --- | --- |
| AI Engineer | Gemini Vision extraction, structured JSON contract, validation and normalization |
| GenAI Engineer | Multimodal prompting, receipt-specific edge cases, Thai/English support |
| Data Engineer | Supabase/PostgreSQL persistence, typed receipt records, analytics API flow |
| Data Analyst | Category spending, shop summaries, time-series dashboard, recent activity metrics |
| Full-Stack / Frontend | Next.js, React, TypeScript, upload/review/history/dashboard UI |

## AI Problem Solved

Receipts contain messy visual information: shop names, dates, line items, totals, tax IDs, and mixed Thai/English text. This app uses a vision-language model to extract receipt data into a reliable schema, then turns that data into searchable records and analytics.

## Architecture

```text
Receipt image
  -> Next.js upload UI
  -> /api/receipts/parse
  -> Gemini Vision extraction prompt
  -> JSON validation and normalization
  -> Thai Buddhist Era date conversion
  -> Supabase receipts table
  -> Receipt CRUD and stats APIs
  -> Recharts analytics dashboard
```

## AI and Data Flow

- Accepts receipt images from the browser upload flow.
- Sends the image to Gemini Vision with a strict extraction prompt.
- Normalizes extracted dates, including Buddhist Era year formats such as 2568 or 68.
- Validates structured fields before persistence.
- Stores receipts in Supabase/PostgreSQL with item details in JSONB.
- Aggregates totals, categories, shops, recent receipts, and spending trends for dashboard views.

## Key Engineering Highlights

- Multimodal extraction from real receipt images.
- Thai/English receipt handling.
- Deterministic JSON output contract around an LLM response.
- Clear API boundary between AI parsing, data storage, and analytics.
- Full product flow: upload, parse, review, persist, browse, analyze.

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| AI | Google Gemini 2.0 Flash Vision, `@google/generative-ai` |
| Data | Supabase, PostgreSQL, JSONB |
| Analytics | Recharts, receipt stats API |
| UX | React Dropzone, Lucide React |

## Database Schema

Core table:

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

## Evaluation and Testing

Recommended evaluation cases for this repo:

| Case | Expected behavior |
| --- | --- |
| Clear Thai receipt | Correct shop, total, date conversion, category |
| English receipt | Correct fields without Thai-specific assumptions |
| Buddhist Era date | Converts to Gregorian `YYYY-MM-DD` |
| Missing tax ID | Keeps tax ID empty/null without failing parse |
| Low-quality image | Returns controlled error or partial result for review |

Available checks:

```bash
npm run lint
npm run build
```

## Local Setup

```bash
git clone https://github.com/Praciller/receipt-ai-expense-tracker.git
cd receipt-ai-expense-tracker
npm install
```

Create `.env.local`:

```env
GEMINI_API_KEY=your_google_ai_studio_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Why This Repo Matters

This project is a strong AI Engineer and Data/Analytics signal because it connects multimodal AI extraction to a real database and dashboard workflow. It shows more than a prompt: it shows data normalization, persistence, analytics, and a complete user-facing product.

## License

MIT
