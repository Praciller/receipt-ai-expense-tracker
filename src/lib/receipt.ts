import { z } from 'zod';

export const RECEIPT_CATEGORIES = [
  'food',
  'transport',
  'office',
  'shopping',
  'utilities',
  'health',
  'other',
] as const;

export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];
export type ParseStatus = 'parsed' | 'partial' | 'failed' | 'review_required';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  price?: number;
}

export interface ParsedReceipt {
  shop_name: string;
  date: string;
  items: ReceiptItem[];
  total_amount: number;
  tax_id: string | null;
  category: ReceiptCategory;
  currency: 'THB';
  confidence: number;
  notes: string;
  parse_status: ParseStatus;
}

export interface ReceiptRecord extends ParsedReceipt {
  id: string;
  created_at: string;
  image_base64?: string | null;
  image_mime_type?: string | null;
}

const receiptItemSchema = z.object({
  name: z.string().trim().min(1).max(300),
  quantity: z.number().positive().finite(),
  unit_price: z.number().nonnegative().finite(),
  total_price: z.number().nonnegative().finite(),
});

const parsedReceiptSchema = z.object({
  shop_name: z.string().trim().min(1).max(300),
  date: z.string().date(),
  items: z.array(receiptItemSchema).max(500),
  total_amount: z.number().nonnegative().finite(),
  tax_id: z.string().trim().max(100).nullable(),
  category: z.enum(RECEIPT_CATEGORIES),
  currency: z.literal('THB'),
  confidence: z.number().min(0).max(1),
  notes: z.string().trim().max(2000),
  parse_status: z.enum(['parsed', 'partial', 'failed', 'review_required']),
});

const categoryAliases: Record<string, ReceiptCategory> = {
  food: 'food',
  restaurant: 'food',
  dining: 'food',
  grocery: 'food',
  'อาหาร': 'food',
  'อาหารและเครื่องดื่ม': 'food',
  transport: 'transport',
  transportation: 'transport',
  travel: 'transport',
  taxi: 'transport',
  fuel: 'transport',
  'เดินทาง': 'transport',
  office: 'office',
  business: 'office',
  stationery: 'office',
  'สำนักงาน': 'office',
  shopping: 'shopping',
  retail: 'shopping',
  'ช้อปปิ้ง': 'shopping',
  utility: 'utilities',
  utilities: 'utilities',
  electricity: 'utilities',
  water: 'utilities',
  internet: 'utilities',
  'สาธารณูปโภค': 'utilities',
  health: 'health',
  healthcare: 'health',
  medical: 'health',
  pharmacy: 'health',
  'สุขภาพ': 'health',
  other: 'other',
  entertainment: 'other',
};

export function normalizeCategory(value: unknown): ReceiptCategory {
  if (typeof value !== 'string') {
    return 'other';
  }

  return categoryAliases[value.trim().toLowerCase()] ?? 'other';
}

export function normalizeReceiptDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/);
  if (!match) {
    return null;
  }

  const [, first, second, third] = match;
  const isoOrder = first.length === 4;
  const day = Number(isoOrder ? third : first);
  const month = Number(second);
  let year = Number(isoOrder ? first : third);

  if (year >= 2400 && year <= 2699) {
    year -= 543;
  } else if (year >= 60 && year <= 99) {
    year = year + 2500 - 543;
  } else if (year < 100) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.replace(/[,\s฿$]/g, '');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeItems(value: unknown): ReceiptItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') {
      return [];
    }

    const item = candidate as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const quantity = toNumber(item.quantity) ?? 1;
    const unitPrice = toNumber(item.unit_price ?? item.price) ?? 0;
    const totalPrice = toNumber(item.total_price) ?? unitPrice * quantity;
    const parsed = receiptItemSchema.safeParse({
      name,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    });

    return parsed.success ? [parsed.data] : [];
  });
}

export function validateAndNormalizeReceipt(
  value: unknown,
): { success: true; data: ParsedReceipt } | { success: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { success: false, error: 'Receipt output must be an object.' };
  }

  const raw = value as Record<string, unknown>;
  const date = normalizeReceiptDate(raw.date);
  const totalAmount = toNumber(raw.total_amount);
  const confidence = toNumber(raw.confidence) ?? 0;
  const shopName = typeof raw.shop_name === 'string' ? raw.shop_name.trim() : '';
  const taxId =
    typeof raw.tax_id === 'string' && raw.tax_id.trim() ? raw.tax_id.trim() : null;

  if (!date) {
    return { success: false, error: 'Receipt date is missing or invalid.' };
  }

  if (!shopName) {
    return { success: false, error: 'Shop name is required.' };
  }

  if (totalAmount === null || totalAmount < 0) {
    return { success: false, error: 'Total amount must be non-negative.' };
  }

  const normalized = parsedReceiptSchema.safeParse({
    shop_name: shopName,
    date,
    items: normalizeItems(raw.items),
    total_amount: totalAmount,
    tax_id: taxId,
    category: normalizeCategory(raw.category),
    currency: 'THB',
    confidence: Math.min(1, Math.max(0, confidence)),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    parse_status: confidence >= 0.65 ? 'parsed' : 'review_required',
  });

  if (!normalized.success) {
    return {
      success: false,
      error: normalized.error.issues.map((issue) => issue.message).join('; '),
    };
  }

  return { success: true, data: normalized.data };
}

export function parseReceiptJson(text: string) {
  const withoutFence = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');

  if (start < 0 || end <= start) {
    return { success: false as const, error: 'Provider did not return JSON.' };
  }

  try {
    return validateAndNormalizeReceipt(JSON.parse(withoutFence.slice(start, end + 1)));
  } catch {
    return { success: false as const, error: 'Provider returned malformed JSON.' };
  }
}
