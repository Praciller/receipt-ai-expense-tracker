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
วิเคราะห์รูปภาพใบเสร็จนี้และดึงข้อมูลออกมาในรูปแบบ JSON เท่านั้น ห้ามมี Markdown block (\`\`\`json)
โครงสร้าง JSON ที่ต้องการ:
{
  "shop_name": "string (ชื่อร้านค้า)",
  "date": "string (YYYY-MM-DD)",
  "items": [
    { "name": "string (ชื่อสินค้า)", "price": number, "quantity": number }
  ],
  "total_amount": number (ยอดสุทธิ),
  "tax_id": "string (เลขผู้เสียภาษี ถ้ามี)",
  "category": "string (ให้เดาประเภท: Food, Transport, Shopping, Utility, Healthcare, Entertainment, Other)"
}

กฎสำคัญ:
1. ถ้าอ่านค่าไหนไม่ออก ให้ใส่ null
2. price และ total_amount ต้องเป็นตัวเลข (number) เท่านั้น
3. quantity ถ้าไม่ระบุให้ใส่ 1
4. date ต้องอยู่ในรูปแบบ YYYY-MM-DD เท่านั้น
5. ตอบเป็น JSON object เท่านั้น ห้ามมีข้อความอื่น
`;

export async function parseReceiptImage(base64Image: string, mimeType: string): Promise<ParsedReceipt> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
