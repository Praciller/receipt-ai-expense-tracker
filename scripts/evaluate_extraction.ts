import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateExtractionCases, formatMetric, type EvaluationCase } from '../src/lib/evaluation.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(await readFile(resolve(root, 'fixtures/evaluation-cases.json'), 'utf8')) as EvaluationCase[];
const evaluation = evaluateExtractionCases(cases);

const reportDirectory = resolve(root, 'reports/extraction');
await mkdir(reportDirectory, { recursive: true });
await writeFile(resolve(reportDirectory, 'metrics.json'), `${JSON.stringify(evaluation, null, 2)}\n`);
await writeFile(resolve(reportDirectory, 'summary.md'), summary(evaluation.metrics));
console.log(`Extraction evaluation completed for ${evaluation.metrics.fixture_count} synthetic fixtures.`);

function summary(metrics: typeof evaluation.metrics) {
  const rows = Object.entries(metrics).map(([name, value]) => {
    const formatted = typeof value === 'number' ? value : formatMetric(value);
    return `| ${name.replaceAll('_', ' ')} | ${formatted} |`;
  }).join('\n');
  return `# Synthetic Extraction Evaluation\n\n| Metric | Result |\n| --- | ---: |\n${rows}\n\nAll inputs are fictional fixtures. These metrics measure deterministic normalization, validation, reconciliation, warning behavior, and source evidence coverage. The denominators are fixture-, field-, or evidence-check counts as appropriate. They do not estimate real OCR or provider accuracy. Provider mode needs a separately designed, consented evaluation set; private receipts and model outputs must not be committed.\n`;
}
