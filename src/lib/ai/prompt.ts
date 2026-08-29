export const RECEIPT_PROMPT = `Extract this Thai or English receipt into JSON.

Return exactly one JSON object with this schema:
{
  "shop_name": "string",
  "date": "YYYY-MM-DD",
  "raw_date_text": "string or null",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit_price": 0,
      "total_price": 0
    }
  ],
  "subtotal": 0,
  "tax_amount": 0,
  "discount": 0,
  "service_charge": 0,
  "total_amount": 0,
  "tax_id": "string or null",
  "category": "food | transport | office | shopping | utilities | health | other",
  "currency": "THB | USD | EUR | GBP | SGD | JPY",
  "confidence": 0.0,
  "notes": "string",
  "warnings": ["string"],
  "evidence": [{ "field": "total_amount", "text": "TOTAL 130.00" }]
}

Rules:
- Return JSON only. No Markdown.
- Convert full Buddhist Era years by subtracting 543.
- Treat Thai short years 60-99 as Buddhist Era 2560-2599, then convert.
- Use null for a missing tax ID.
- Use an empty items array only when shop_name and total_amount are readable.
- Use confidence from 0 to 1.
- Put uncertainty or unreadable details in notes and warnings.
- Use null for unavailable subtotal, tax_amount, discount, and service_charge.
- Preserve extracted financial values as printed; do not adjust an amount to make arithmetic agree.
- Evidence must be short text spans visible on the receipt; never invent it.`;

export const RECEIPT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    shop_name: { type: 'string' },
    date: { type: 'string' },
    raw_date_text: { type: ['string', 'null'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit_price: { type: 'number' },
          total_price: { type: 'number' },
        },
        required: ['name', 'quantity', 'unit_price', 'total_price'],
      },
    },
    subtotal: { type: ['number', 'null'] },
    tax_amount: { type: ['number', 'null'] },
    discount: { type: ['number', 'null'] },
    service_charge: { type: ['number', 'null'] },
    total_amount: { type: 'number' },
    tax_id: { type: ['string', 'null'] },
    category: {
      type: 'string',
      enum: [
        'food',
        'transport',
        'office',
        'shopping',
        'utilities',
        'health',
        'other',
      ],
    },
    currency: { type: 'string', enum: ['THB', 'USD', 'EUR', 'GBP', 'SGD', 'JPY'] },
    confidence: { type: 'number' },
    notes: { type: 'string' },
    warnings: { type: 'array', items: { type: 'string' } },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        properties: { field: { type: 'string' }, text: { type: 'string' } },
        required: ['field', 'text'],
      },
    },
  },
  required: [
    'shop_name',
    'date',
    'raw_date_text',
    'items',
    'subtotal',
    'tax_amount',
    'discount',
    'service_charge',
    'total_amount',
    'tax_id',
    'category',
    'currency',
    'confidence',
    'notes',
    'warnings',
    'evidence',
  ],
};
