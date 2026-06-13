export const RECEIPT_PROMPT = `Extract this Thai or English receipt into JSON.

Return exactly one JSON object with this schema:
{
  "shop_name": "string",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "unit_price": 0,
      "total_price": 0
    }
  ],
  "total_amount": 0,
  "tax_id": "string or null",
  "category": "food | transport | office | shopping | utilities | health | other",
  "currency": "THB",
  "confidence": 0.0,
  "notes": "string"
}

Rules:
- Return JSON only. No Markdown.
- Convert full Buddhist Era years by subtracting 543.
- Treat Thai short years 60-99 as Buddhist Era 2560-2599, then convert.
- Use null for a missing tax ID.
- Use an empty items array only when shop_name and total_amount are readable.
- Use confidence from 0 to 1.
- Put uncertainty or unreadable details in notes.`;

export const RECEIPT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    shop_name: { type: 'string' },
    date: { type: 'string' },
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
    currency: { type: 'string', enum: ['THB'] },
    confidence: { type: 'number' },
    notes: { type: 'string' },
  },
  required: [
    'shop_name',
    'date',
    'items',
    'total_amount',
    'tax_id',
    'category',
    'currency',
    'confidence',
    'notes',
  ],
};
