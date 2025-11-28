-- Receipt Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);
CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);

-- Enable Row Level Security
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust for production with user authentication)
CREATE POLICY "Allow all operations" ON receipts
  FOR ALL USING (true);

-- Optional: Add comments for documentation
COMMENT ON TABLE receipts IS 'Stores parsed receipt data from AI analysis';
COMMENT ON COLUMN receipts.items IS 'JSON array of items: [{name, price, quantity}]';
COMMENT ON COLUMN receipts.category IS 'AI-classified category: Food, Transport, Shopping, Utility, Healthcare, Entertainment, Other';
