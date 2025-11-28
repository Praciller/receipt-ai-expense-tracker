import { NextRequest, NextResponse } from 'next/server';
import { parseReceiptImage } from '@/lib/gemini';
import { supabase, Receipt } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, mimeType } = body;

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: 'Image and mimeType are required' },
        { status: 400 }
      );
    }

    // Parse the receipt using Gemini
    const parsedReceipt = await parseReceiptImage(image, mimeType);

    // Save to Supabase
    const receiptData: Receipt = {
      ...parsedReceipt,
      image_base64: image,
    };

    const { data, error } = await supabase
      .from('receipts')
      .insert([receiptData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save receipt to database', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      receipt: data,
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process receipt' },
      { status: 500 }
    );
  }
}
