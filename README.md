# Receipt Tracker - AI-Powered Expense Tracking

อัปโหลดรูปใบเสร็จ → AI แกะข้อมูลเป็น JSON → แสดงกราฟ Dashboard

## Features

- **AI Receipt Parsing**: ใช้ Gemini 1.5 Flash วิเคราะห์รูปใบเสร็จและดึงข้อมูลอัตโนมัติ
- **Multi-language Support**: รองรับใบเสร็จภาษาไทยและอังกฤษ
- **Dashboard Analytics**: กราฟแสดงสรุปค่าใช้จ่ายตามประเภทและช่วงเวลา
- **Category Classification**: AI จัดประเภทค่าใช้จ่ายอัตโนมัติ (Food, Transport, Shopping, etc.)
- **Receipt History**: ดูรายการใบเสร็จทั้งหมดพร้อมรายละเอียด

## Tech Stack

- **Frontend**: Next.js 15, React, TailwindCSS
- **Charts**: Recharts
- **AI**: Google Gemini 1.5 Flash (Vision)
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/Praciller/receipt-ai-expense-tracker.git
cd receipt-ai-expense-tracker
npm install
```

### 2. Set up Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:
- `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key

### 3. Set up Supabase Database

Run this SQL in your Supabase SQL Editor:

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

-- Enable Row Level Security (optional)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust for production)
CREATE POLICY "Allow all operations" ON receipts
  FOR ALL USING (true);
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Usage

1. **Upload Receipt**: ลากไฟล์รูปใบเสร็จมาวางหรือคลิกเพื่อเลือกไฟล์
2. **AI Processing**: รอ AI วิเคราะห์และดึงข้อมูลจากใบเสร็จ
3. **View Dashboard**: ดูสรุปค่าใช้จ่ายในแดชบอร์ด
4. **Manage Receipts**: ดูรายละเอียดและลบใบเสร็จในหน้ารายการ

## Supported Receipt Types

- ใบเสร็จ 7-Eleven, ร้านสะดวกซื้อ
- ใบเสร็จร้านอาหาร
- ใบกำกับภาษี
- ใบเสร็จซื้อของทั่วไป

## License

MIT
