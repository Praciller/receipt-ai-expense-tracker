import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  areMoneyAmountsWithinRoundingTolerance,
  validateAndNormalizeReceipt,
} from '../src/lib/receipt.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(await readFile(resolve(root, 'fixtures/evaluation-cases.json'), 'utf8')) as EvaluationCase[];
const outcomes = cases.map(evaluate);
const valid = outcomes.filter((outcome) => outcome.expectedSuccess);
const successful = valid.filter((outcome) => outcome.schemaValid);
const metrics = {
  fixture_count: cases.length,
  parse_success_rate: ratio(outcomes.filter((outcome) => outcome.schemaValid).length, outcomes.length),
  schema_valid_response_rate: ratio(successful.length, valid.length),
  invalid_case_rejection_rate: ratio(outcomes.filter((outcome) => !outcome.expectedSuccess && !outcome.schemaValid).length, outcomes.filter((outcome) => !outcome.expectedSuccess).length),
  exact_match: average(successful, 'exactMatch'),
  numeric_tolerance_match: average(successful, 'numericMatch'),
  item_count_accuracy: average(successful, 'itemCountMatch'),
  field_level_completeness: average(successful, 'completeness'),
  validation_warning_accuracy: average(successful, 'warningMatch'),
  reconciliation_status_accuracy: average(successful, 'reconciliationStatusMatch'),
  item_mismatch_accuracy: average(successful, 'itemMismatchMatch'),
};

const reportDirectory = resolve(root, 'reports/extraction');
await mkdir(reportDirectory, { recursive: true });
await writeFile(resolve(reportDirectory, 'metrics.json'), `${JSON.stringify({ generated_from: 'synthetic fixtures only', metrics, cases: outcomes }, null, 2)}\n`);
await writeFile(resolve(reportDirectory, 'summary.md'), summary(metrics));
console.log(`Extraction evaluation passed: ${successful.length}/${valid.length} valid fixtures schema-valid; ${metrics.invalid_case_rejection_rate * 100}% invalid cases rejected.`);

function evaluate(testCase: EvaluationCase): Outcome {
  const result = validateAndNormalizeReceipt(testCase.input);
  if (!result.success) {
    return { id: testCase.id, expectedSuccess: testCase.expected.success, schemaValid: false, exactMatch: 0, numericMatch: 0, itemCountMatch: 0, completeness: 0, warningMatch: Number(!testCase.expected.success), reconciliationStatusMatch: Number(!testCase.expected.success), itemMismatchMatch: Number(!testCase.expected.success) };
  }

  const receipt = result.data;
  const receiptFields = receipt as unknown as Record<string, unknown>;
  const input = testCase.input;
  const expectedCategory = input.category === 'restaurant' ? 'food' : input.category;
  const exact = [receipt.shop_name === input.shop_name, receipt.date === testCase.expected.date, receipt.currency === input.currency, receipt.category === expectedCategory];
  const numeric = ['total_amount', 'subtotal', 'tax_amount', 'discount', 'service_charge'].filter((field) => input[field] !== undefined).map((field) => close(receiptFields[field], input[field]));
  const complete = ['shop_name', 'date', 'currency', 'category', 'confidence', 'warnings', 'evidence', 'reconciliation_status', 'reconciliation_warnings', 'parse_status'].filter((field) => receiptFields[field] !== undefined && receiptFields[field] !== null).length / 10;
  return {
    id: testCase.id,
    expectedSuccess: testCase.expected.success,
    schemaValid: true,
    exactMatch: ratio(exact.filter(Boolean).length, exact.length),
    numericMatch: ratio(numeric.filter(Boolean).length, numeric.length),
    itemCountMatch: Number(receipt.items.length === (Array.isArray(input.items) ? input.items.length : 0)),
    completeness: complete,
    warningMatch: Number(receipt.warnings.length === (testCase.expected.warning_count ?? 0)),
    reconciliationStatusMatch: Number(
      testCase.expected.reconciliation_status === undefined ||
        receipt.reconciliation_status === testCase.expected.reconciliation_status,
    ),
    itemMismatchMatch: Number(
      testCase.expected.item_mismatch_count === undefined ||
        receipt.item_mismatch_count === testCase.expected.item_mismatch_count,
    ),
  };
}

function close(left: unknown, right: unknown) {
  return typeof left === 'number' && typeof right === 'number' && areMoneyAmountsWithinRoundingTolerance(left, right);
}

function ratio(numerator: number, denominator: number) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : 1;
}

function average(items: Outcome[], field: keyof Outcome) {
  return ratio(items.reduce((sum, item) => sum + Number(item[field]), 0), items.length);
}

function summary(metrics: Record<string, number>) {
  const rows = Object.entries(metrics).map(([name, value]) => `| ${name.replaceAll('_', ' ')} | ${name === 'fixture_count' ? value : `${(value * 100).toFixed(1)}%`} |`).join('\n');
  return `# Synthetic Extraction Evaluation\n\n| Metric | Result |\n| --- | ---: |\n${rows}\n\nAll inputs are synthetic fixtures. These metrics verify deterministic normalization, schema validation, warning behavior, and mock-pipeline stability; they are not a guarantee of real OCR or provider accuracy. Provider mode requires separate private evaluation, and private receipts or outputs must not be committed.\n`;
}

interface EvaluationCase { id: string; input: Record<string, unknown>; expected: { success: boolean; date?: string; warning_count?: number; reconciliation_status?: string; item_mismatch_count?: number } }
interface Outcome { id: string; expectedSuccess: boolean; schemaValid: boolean; exactMatch: number; numericMatch: number; itemCountMatch: number; completeness: number; warningMatch: number; reconciliationStatusMatch: number; itemMismatchMatch: number }
