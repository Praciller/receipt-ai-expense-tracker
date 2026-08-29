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
export const RECEIPT_CURRENCIES = ['THB', 'USD', 'EUR', 'GBP', 'SGD', 'JPY'] as const;

export type ReceiptCategory = (typeof RECEIPT_CATEGORIES)[number];
export type ReceiptCurrency = (typeof RECEIPT_CURRENCIES)[number];
export type ParseStatus = 'parsed' | 'partial' | 'failed' | 'review_required';
export type ReconciliationStatus =
  | 'reconciled'
  | 'review_required'
  | 'insufficient_evidence';

export interface ReceiptEvidence {
  field: string;
  text: string;
}

export interface DateNormalization {
  calendar: 'gregorian' | 'buddhist_era';
  original_year: number;
  converted: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  price?: number;
}

export interface ItemReconciliation {
  item_index: number;
  expected_total: number;
  extracted_total: number;
  delta: number;
  matched: boolean;
}

export interface ParsedReceipt {
  shop_name: string;
  date: string;
  raw_date_text: string | null;
  date_normalization: DateNormalization;
  items: ReceiptItem[];
  subtotal: number | null;
  tax_amount: number | null;
  discount: number | null;
  service_charge: number | null;
  total_amount: number;
  tax_id: string | null;
  category: ReceiptCategory;
  currency: ReceiptCurrency;
  confidence: number;
  notes: string;
  warnings: string[];
  evidence: ReceiptEvidence[];
  reconciliation_status: ReconciliationStatus;
  item_reconciliation: ItemReconciliation[];
  item_mismatch_count: number;
  item_total_delta: number;
  receipt_total_delta: number;
  reconciliation_warnings: string[];
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

const evidenceSchema = z.object({
  field: z.string().trim().min(1).max(100),
  text: z.string().trim().min(1).max(500),
});

const itemReconciliationSchema = z.object({
  item_index: z.number().int().nonnegative().max(499),
  expected_total: z.number().finite(),
  extracted_total: z.number().finite(),
  delta: z.number().finite(),
  matched: z.boolean(),
});

const parsedReceiptSchema = z.object({
  shop_name: z.string().trim().min(1).max(300),
  date: z.string().date(),
  raw_date_text: z.string().trim().max(100).nullable(),
  date_normalization: z.object({
    calendar: z.enum(['gregorian', 'buddhist_era']),
    original_year: z.number().int().min(0).max(2699),
    converted: z.boolean(),
  }),
  items: z.array(receiptItemSchema).max(500),
  subtotal: z.number().nonnegative().finite().nullable(),
  tax_amount: z.number().nonnegative().finite().nullable(),
  discount: z.number().nonnegative().finite().nullable(),
  service_charge: z.number().nonnegative().finite().nullable(),
  total_amount: z.number().nonnegative().finite(),
  tax_id: z.string().trim().max(100).nullable(),
  category: z.enum(RECEIPT_CATEGORIES),
  currency: z.enum(RECEIPT_CURRENCIES),
  confidence: z.number().min(0).max(1),
  notes: z.string().trim().max(2000),
  warnings: z.array(z.string().trim().min(1).max(500)).max(100),
  evidence: z.array(evidenceSchema).max(100),
  reconciliation_status: z.enum([
    'reconciled',
    'review_required',
    'insufficient_evidence',
  ]),
  item_reconciliation: z.array(itemReconciliationSchema).max(500),
  item_mismatch_count: z.number().int().nonnegative().max(500),
  item_total_delta: z.number().finite(),
  receipt_total_delta: z.number().finite(),
  reconciliation_warnings: z.array(z.string().trim().min(1).max(500)).max(100),
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
  return normalizeReceiptDateWithMetadata(value)?.date ?? null;
}

function normalizeReceiptDateWithMetadata(value: unknown): {
  date: string;
  metadata: DateNormalization;
} | null {
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

  const originalYear = year;
  let calendar: DateNormalization['calendar'] = 'gregorian';
  if (year >= 2400 && year <= 2699) {
    calendar = 'buddhist_era';
    year -= 543;
  } else if (year >= 60 && year <= 99) {
    calendar = 'buddhist_era';
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

  return {
    date: `${year.toString().padStart(4, '0')}-${month
      .toString()
      .padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
    metadata: {
      calendar,
      original_year: originalYear,
      converted: calendar === 'buddhist_era',
    },
  };
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

interface ExactDecimal {
  coefficient: bigint;
  scale: number;
}

const RECONCILIATION_TOLERANCE = exactDecimal('0.01')!;
const MAX_RECONCILIATION_AMOUNT = exactDecimal('1000000000000')!;

function exactDecimal(value: number | string): ExactDecimal | null {
  const source = typeof value === 'number' ? value.toString() : value.trim();
  const match = source.match(/^([+-]?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
  if (!match) {
    return null;
  }

  const [, sign, whole, fraction = '', exponentText] = match;
  const exponent = exponentText ? Number(exponentText) : 0;
  const scale = fraction.length - exponent;
  if (!Number.isSafeInteger(exponent) || scale > 18) {
    return null;
  }

  let coefficient = BigInt(`${sign === '-' ? '-' : ''}${whole}${fraction}`);
  let normalizedScale = scale;
  if (normalizedScale < 0) {
    coefficient *= 10n ** BigInt(-normalizedScale);
    normalizedScale = 0;
  }

  while (normalizedScale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    normalizedScale -= 1;
  }

  return { coefficient, scale: normalizedScale };
}

function decimalAdd(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const scale = Math.max(left.scale, right.scale);
  return normalizeDecimal({
    coefficient:
      left.coefficient * 10n ** BigInt(scale - left.scale) +
      right.coefficient * 10n ** BigInt(scale - right.scale),
    scale,
  });
}

function decimalSubtract(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  return decimalAdd(left, {
    coefficient: -right.coefficient,
    scale: right.scale,
  });
}

function decimalMultiply(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  return normalizeDecimal({
    coefficient: left.coefficient * right.coefficient,
    scale: left.scale + right.scale,
  });
}

function decimalAbs(value: ExactDecimal): ExactDecimal {
  return {
    coefficient: value.coefficient < 0n ? -value.coefficient : value.coefficient,
    scale: value.scale,
  };
}

function normalizeDecimal(value: ExactDecimal): ExactDecimal {
  let coefficient = value.coefficient;
  let scale = value.scale;
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }
  return { coefficient, scale };
}

function compareDecimals(left: ExactDecimal, right: ExactDecimal) {
  const scale = Math.max(left.scale, right.scale);
  const leftCoefficient = left.coefficient * 10n ** BigInt(scale - left.scale);
  const rightCoefficient = right.coefficient * 10n ** BigInt(scale - right.scale);
  return leftCoefficient === rightCoefficient
    ? 0
    : leftCoefficient < rightCoefficient
      ? -1
      : 1;
}

function isWithinRoundingTolerance(value: ExactDecimal) {
  return compareDecimals(decimalAbs(value), RECONCILIATION_TOLERANCE) <= 0;
}

export function areMoneyAmountsWithinRoundingTolerance(left: number, right: number) {
  const leftDecimal = exactDecimal(left);
  const rightDecimal = exactDecimal(right);
  return Boolean(
    leftDecimal && rightDecimal &&
      isWithinRoundingTolerance(decimalSubtract(leftDecimal, rightDecimal)),
  );
}

function decimalToNumber(value: ExactDecimal) {
  const number = Number(decimalToString(value));
  return Number.isFinite(number) ? number : null;
}

function decimalToString(value: ExactDecimal, fixedScale?: number) {
  const normalized = normalizeDecimal(value);
  const targetScale = fixedScale ?? normalized.scale;
  let coefficient = normalized.coefficient;
  if (normalized.scale < targetScale) {
    coefficient *= 10n ** BigInt(targetScale - normalized.scale);
  } else if (normalized.scale > targetScale) {
    const divisor = 10n ** BigInt(normalized.scale - targetScale);
    const remainder = coefficient < 0n ? -coefficient % divisor : coefficient % divisor;
    coefficient /= divisor;
    if (remainder * 2n >= divisor) {
      coefficient += normalized.coefficient < 0n ? -1n : 1n;
    }
  }

  const negative = coefficient < 0n;
  const scale = targetScale;
  const digits = (negative ? -coefficient : coefficient)
    .toString()
    .padStart(scale + 1, '0');
  const whole = digits.slice(0, -scale || undefined) || '0';
  const fraction = digits.slice(-scale).padEnd(scale, '0');
  return `${negative ? '-' : ''}${whole}${scale ? `.${fraction}` : ''}`;
}

function formatMoney(value: ExactDecimal, currency: ReceiptCurrency) {
  const symbols: Record<ReceiptCurrency, string> = {
    THB: '฿',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SGD: 'S$',
    JPY: '¥',
  };
  return `${symbols[currency]}${decimalToString(decimalAbs(value), 2)}`;
}

function isBoundedAmount(value: ExactDecimal) {
  return compareDecimals(decimalAbs(value), MAX_RECONCILIATION_AMOUNT) <= 0;
}

function normalizeItems(value: unknown):
  | { success: true; items: ReceiptItem[] }
  | { success: false; error: string } {
  if (!Array.isArray(value)) {
    return { success: true, items: [] };
  }

  const items: ReceiptItem[] = [];
  for (const [index, candidate] of value.entries()) {
    if (!candidate || typeof candidate !== 'object') {
      return {
        success: false,
        error: `Receipt line item ${index + 1} is invalid.`,
      };
    }

    const item = candidate as Record<string, unknown>;
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price ?? item.price);
    const totalPrice = toNumber(item.total_price);
    if (quantity === null || unitPrice === null || totalPrice === null) {
      return {
        success: false,
        error: `Receipt line item ${index + 1} is invalid.`,
      };
    }

    const parsed = receiptItemSchema.safeParse({
      name,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: `Receipt line item ${index + 1} is invalid.`,
      };
    }
    items.push(parsed.data);
  }

  return { success: true, items };
}

function optionalAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return toNumber(value);
}

export function validateAndNormalizeReceipt(
  value: unknown,
): { success: true; data: ParsedReceipt } | { success: false; error: string } {
  if (!value || typeof value !== 'object') {
    return { success: false, error: 'Receipt output must be an object.' };
  }

  const raw = value as Record<string, unknown>;
  const normalizedDate = normalizeReceiptDateWithMetadata(raw.date);
  const totalAmount = toNumber(raw.total_amount);
  const confidence = toNumber(raw.confidence) ?? 0;
  const shopName = typeof raw.shop_name === 'string' ? raw.shop_name.trim() : '';
  const taxId =
    typeof raw.tax_id === 'string' && raw.tax_id.trim() ? raw.tax_id.trim() : null;

  if (!normalizedDate) {
    return { success: false, error: 'Receipt date is missing or invalid.' };
  }

  if (!shopName) {
    return { success: false, error: 'Shop name is required.' };
  }

  if (totalAmount === null || totalAmount < 0) {
    return { success: false, error: 'Total amount must be non-negative.' };
  }
  if (confidence < 0 || confidence > 1) {
    return { success: false, error: 'Confidence must be between 0 and 1.' };
  }

  const currency =
    typeof raw.currency === 'string' ? raw.currency.trim().toUpperCase() : '';
  if (!RECEIPT_CURRENCIES.includes(currency as ReceiptCurrency)) {
    return { success: false, error: 'Receipt currency is unsupported.' };
  }

  const normalizedItems = normalizeItems(raw.items);
  if (!normalizedItems.success) {
    return normalizedItems;
  }
  const items = normalizedItems.items;
  const subtotal = optionalAmount(raw.subtotal);
  const taxAmount = optionalAmount(raw.tax_amount);
  const discount = optionalAmount(raw.discount);
  const serviceCharge = optionalAmount(raw.service_charge);
  const financialAmounts = [subtotal, taxAmount, discount, serviceCharge];
  if (financialAmounts.some((amount) => amount !== null && amount < 0)) {
    return { success: false, error: 'Receipt amounts must be non-negative.' };
  }

  const totalDecimal = exactDecimal(totalAmount);
  if (!totalDecimal || !isBoundedAmount(totalDecimal)) {
    return {
      success: false,
      error: 'Receipt amount exceeds the supported reconciliation bound.',
    };
  }

  const itemDecimals = items.map((item) => ({
    quantity: exactDecimal(item.quantity),
    unitPrice: exactDecimal(item.unit_price),
    totalPrice: exactDecimal(item.total_price),
  }));
  if (
    itemDecimals.some(
      ({ quantity, unitPrice, totalPrice }) =>
        !quantity ||
        !unitPrice ||
        !totalPrice ||
        !isBoundedAmount(unitPrice) ||
        !isBoundedAmount(totalPrice),
    )
  ) {
    return {
      success: false,
      error: 'Receipt line-item amount exceeds the supported reconciliation bound.',
    };
  }
  const expectedItemTotals = itemDecimals.map(({ quantity, unitPrice }) =>
    decimalMultiply(quantity!, unitPrice!),
  );
  if (expectedItemTotals.some((amount) => !isBoundedAmount(amount))) {
    return {
      success: false,
      error: 'Receipt line-item amount exceeds the supported reconciliation bound.',
    };
  }

  const optionalAmountDecimals = financialAmounts.map((amount) =>
    amount === null ? null : exactDecimal(amount),
  );
  if (
    optionalAmountDecimals.some(
      (amount) => amount !== null && (!amount || !isBoundedAmount(amount)),
    )
  ) {
    return {
      success: false,
      error: 'Receipt amount exceeds the supported reconciliation bound.',
    };
  }

  const warnings = Array.isArray(raw.warnings)
    ? raw.warnings.filter((warning): warning is string => typeof warning === 'string' && Boolean(warning.trim())).map((warning) => warning.trim())
    : [];

  const itemReconciliation = itemDecimals.map(
    ({ totalPrice }, itemIndex) => {
      const expectedTotal = expectedItemTotals[itemIndex]!;
      const delta = decimalSubtract(totalPrice!, expectedTotal);
      return {
        item_index: itemIndex,
        expected_total: decimalToNumber(expectedTotal)!,
        extracted_total: items[itemIndex]!.total_price,
        delta: decimalToNumber(delta)!,
        matched: isWithinRoundingTolerance(delta),
      } satisfies ItemReconciliation;
    },
  );
  const itemMismatchCount = itemReconciliation.filter((item) => !item.matched).length;
  const itemTotalDelta = itemDecimals.reduce(
    (sum, { quantity, unitPrice, totalPrice }) =>
      decimalAdd(sum, decimalSubtract(totalPrice!, decimalMultiply(quantity!, unitPrice!))),
    exactDecimal('0')!,
  );
  const lineItemTotal = itemDecimals.reduce(
    (sum, { totalPrice }) => decimalAdd(sum, totalPrice!),
    exactDecimal('0')!,
  );
  const receiptTotalDelta = decimalSubtract(lineItemTotal, totalDecimal);
  const reconciliationWarnings: string[] = [];

  if (!items.length) {
    reconciliationWarnings.push(
      'Unable to reconcile because no line items were extracted.',
    );
  } else if (itemMismatchCount > 0) {
    reconciliationWarnings.push(
      `${itemMismatchCount} line item${itemMismatchCount === 1 ? '' : 's'} do${itemMismatchCount === 1 ? 'es' : ''} not match quantity × unit price.`,
    );
  }

  if (items.length && !isWithinRoundingTolerance(receiptTotalDelta)) {
    reconciliationWarnings.push(
      `Line-item sum differs from receipt total by ${formatMoney(receiptTotalDelta, currency as ReceiptCurrency)}.`,
    );
  }

  const subtotalDecimal = optionalAmountDecimals[0];
  const taxAmountDecimal = optionalAmountDecimals[1];
  const discountDecimal = optionalAmountDecimals[2];
  const serviceChargeDecimal = optionalAmountDecimals[3];
  let financialBreakdownMismatch = false;
  if (subtotalDecimal) {
    const expectedTotal = decimalAdd(
      decimalAdd(
        decimalAdd(subtotalDecimal, taxAmountDecimal ?? exactDecimal('0')!),
        serviceChargeDecimal ?? exactDecimal('0')!,
      ),
      {
        coefficient: -(discountDecimal ?? exactDecimal('0')!).coefficient,
        scale: (discountDecimal ?? exactDecimal('0')!).scale,
      },
    );
    if (!isWithinRoundingTolerance(decimalSubtract(expectedTotal, totalDecimal))) {
      financialBreakdownMismatch = true;
      reconciliationWarnings.push('Grand total does not match the financial breakdown.');
    }
  }

  const reconciliationStatus: ReconciliationStatus = !items.length
    ? 'insufficient_evidence'
    : itemMismatchCount === 0 &&
        isWithinRoundingTolerance(receiptTotalDelta) &&
        !financialBreakdownMismatch
      ? 'reconciled'
      : 'review_required';
  const reconciliationEvidenceWarnings = [...new Set(reconciliationWarnings)];
  const allWarnings = [...new Set([...warnings, ...reconciliationEvidenceWarnings])];

  const evidence = Array.isArray(raw.evidence)
    ? raw.evidence.flatMap((candidate) => {
        const parsed = evidenceSchema.safeParse(candidate);
        return parsed.success ? [parsed.data] : [];
      })
    : [];

  const normalized = parsedReceiptSchema.safeParse({
    shop_name: shopName,
    date: normalizedDate.date,
    raw_date_text:
      typeof raw.raw_date_text === 'string'
        ? raw.raw_date_text
        : typeof raw.date === 'string'
          ? raw.date
          : null,
    date_normalization: normalizedDate.metadata,
    items,
    subtotal,
    tax_amount: taxAmount,
    discount,
    service_charge: serviceCharge,
    total_amount: totalAmount,
    tax_id: taxId,
    category: normalizeCategory(raw.category),
    currency,
    confidence,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    warnings: allWarnings,
    evidence,
    reconciliation_status: reconciliationStatus,
    item_reconciliation: itemReconciliation,
    item_mismatch_count: itemMismatchCount,
    item_total_delta: decimalToNumber(itemTotalDelta)!,
    receipt_total_delta: decimalToNumber(receiptTotalDelta)!,
    reconciliation_warnings: reconciliationEvidenceWarnings,
    parse_status:
      confidence >= 0.65 && allWarnings.length === 0 ? 'parsed' : 'review_required',
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
