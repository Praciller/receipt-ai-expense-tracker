import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ParsedReceipt {
  shop_name: string | null;
  date: string | null;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  total_amount: number | null;
  tax_id: string | null;
  category: string | null;
}

const RECEIPT_PROMPT = `
Analyze this receipt image and extract data in JSON format only. No Markdown blocks.

IMPORTANT: Thai receipts use Buddhist Era (พ.ศ.) dates. If you see a 2-digit year like 68, 67, 66, it means Buddhist year 2568, 2567, 2566. 
Convert to Gregorian (ค.ศ.) by subtracting 543. Example: 27/11/68 = 27/11/2568 พ.ศ. = 2025-11-27 in Gregorian.

Required JSON structure:
{
  "shop_name": "string (store name)",
  "date": "string (YYYY-MM-DD in Gregorian/Western calendar)",
  "items": [
    { "name": "string (item name)", "price": number, "quantity": number }
  ],
  "total_amount": number (total amount),
  "tax_id": "string (tax ID if present)",
  "category": "string (guess category: Food, Transport, Shopping, Utility, Healthcare, Entertainment, Other)"
}

Rules:
1. If you cannot read a value, use null
2. price and total_amount must be numbers only
3. quantity defaults to 1 if not specified
4. date MUST be in YYYY-MM-DD format (Gregorian calendar, NOT Buddhist Era)
5. For Thai dates: subtract 543 from Buddhist year to get Gregorian year
6. Return JSON object only, no other text
`;

export async function parseReceiptImage(base64Image: string, mimeType: string): Promise<ParsedReceipt> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  try {
    const result = await model.generateContent([RECEIPT_PROMPT, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean up the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const parsed: ParsedReceipt = JSON.parse(cleanedText);

    // Validate and sanitize the response
    return {
      shop_name: typeof parsed.shop_name === 'string' ? parsed.shop_name : null,
      date: typeof parsed.date === 'string' ? parsed.date : null,
      items: Array.isArray(parsed.items)
        ? parsed.items.map((item) => ({
            name: typeof item.name === 'string' ? item.name : 'Unknown',
            price: typeof item.price === 'number' ? item.price : 0,
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          }))
        : [],
      total_amount: typeof parsed.total_amount === 'number' ? parsed.total_amount : null,
      tax_id: typeof parsed.tax_id === 'string' ? parsed.tax_id : null,
      category: typeof parsed.category === 'string' ? parsed.category : 'Other',
    };
  } catch (error) {
    console.error('Error parsing receipt:', error);
    throw new Error('Failed to parse receipt image. Please try again with a clearer image.');
  }
}
