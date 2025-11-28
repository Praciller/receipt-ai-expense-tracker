import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Receipt {
  id?: string;
  shop_name: string | null;
  date: string | null;
  items: ReceiptItem[];
  total_amount: number | null;
  tax_id: string | null;
  category: string | null;
  created_at?: string;
  image_base64?: string;
}

export interface ReceiptRow {
  id: string;
  shop_name: string | null;
  date: string | null;
  items: ReceiptItem[];
  total_amount: number | null;
  tax_id: string | null;
  category: string | null;
  created_at: string;
  image_base64: string | null;
}
