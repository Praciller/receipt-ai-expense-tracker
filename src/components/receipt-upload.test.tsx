import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReceiptUpload } from './receipt-upload';

const repositoryCreate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/storage/get-receipt-repository', () => ({
  getReceiptRepository: vi.fn(async () => ({
    create: repositoryCreate,
  })),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  repositoryCreate.mockReset();
});

describe('ReceiptUpload', () => {
  it('shows parsed fields for review and saves only after confirmation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ mock_ai_mode: true }), { status: 200 }))
      .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          receipt: {
            shop_name: 'Portfolio Cafe',
            date: '2025-06-13',
            raw_date_text: '2025-06-13',
            date_normalization: { calendar: 'gregorian', original_year: 2025, converted: false },
            items: [],
            subtotal: null,
            tax_amount: null,
            discount: null,
            service_charge: null,
            total_amount: 180,
            tax_id: null,
            category: 'food',
            currency: 'THB',
            confidence: 0.92,
            notes: '',
            warnings: [],
            evidence: [],
            parse_status: 'parsed',
          },
          provider_used: 'external',
          model_used: 'receipt-model',
          fallback_used: true,
          cached: false,
          degraded_mode: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    repositoryCreate.mockResolvedValue({ id: 'saved-1' });

    render(<ReceiptUpload />);

    const input = screen.getByLabelText(/receipt image/i);
    const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByDisplayValue('Portfolio Cafe')).toBeInTheDocument();
    expect(screen.getByText('external · receipt-model')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: /save receipt/i }));

    await waitFor(() => expect(repositoryCreate).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(repositoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({ shop_name: 'Portfolio Cafe' }),
      expect.objectContaining({ mimeType: 'image/jpeg' }),
    );
    expect(
      await screen.findByText(/saved locally to expense history/i),
    ).toBeInTheDocument();
  });

  it('shows reconciliation warnings before a human can save the parsed receipt', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ mock_ai_mode: true }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            receipt: {
              shop_name: 'Mismatch Cafe',
              date: '2025-06-13',
              raw_date_text: '2025-06-13',
              date_normalization: { calendar: 'gregorian', original_year: 2025, converted: false },
              items: [{ name: 'Coffee', quantity: 2, unit_price: 10, total_price: 18 }],
              subtotal: null,
              tax_amount: null,
              discount: null,
              service_charge: null,
              total_amount: 18,
              tax_id: null,
              category: 'food',
              currency: 'THB',
              confidence: 0.92,
              notes: '',
              warnings: ['1 line item does not match quantity × unit price.'],
              evidence: [],
              reconciliation_status: 'review_required',
              item_reconciliation: [{ item_index: 0, expected_total: 20, extracted_total: 18, delta: -2, matched: false }],
              item_mismatch_count: 1,
              item_total_delta: -2,
              receipt_total_delta: 0,
              reconciliation_warnings: ['1 line item does not match quantity × unit price.'],
              parse_status: 'review_required',
            },
            provider_used: 'mock',
            model_used: 'deterministic-fixture',
            cached: false,
            degraded_mode: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    render(<ReceiptUpload />);

    fireEvent.change(screen.getByLabelText(/receipt image/i), {
      target: { files: [new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' })] },
    });

    expect(
      await screen.findByText('Reconciliation review signal'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('1 line item does not match quantity × unit price.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Item 1 unit price')).toHaveValue(10);
    expect(screen.getByRole('button', { name: /save receipt/i })).not.toBeDisabled();
    expect(repositoryCreate).not.toHaveBeenCalled();
  });
});
