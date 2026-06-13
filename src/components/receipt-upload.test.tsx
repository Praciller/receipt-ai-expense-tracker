import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReceiptUpload } from './receipt-upload';

const repositoryCreate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/storage/get-receipt-repository', () => ({
  getReceiptRepository: vi.fn(async () => ({
    create: repositoryCreate,
  })),
}));

afterEach(() => {
  vi.restoreAllMocks();
  repositoryCreate.mockReset();
});

describe('ReceiptUpload', () => {
  it('shows parsed fields for review and saves only after confirmation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          receipt: {
            shop_name: 'Portfolio Cafe',
            date: '2025-06-13',
            items: [],
            total_amount: 180,
            tax_id: null,
            category: 'food',
            currency: 'THB',
            confidence: 0.92,
            notes: '',
            parse_status: 'parsed',
          },
          provider_used: 'gemini',
          model_used: 'gemini-2.5-flash-lite',
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
    expect(
      screen.getByText('gemini · gemini-2.5-flash-lite'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /save receipt/i }));

    await waitFor(() => expect(repositoryCreate).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(repositoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({ shop_name: 'Portfolio Cafe' }),
      expect.objectContaining({ mimeType: 'image/jpeg' }),
    );
    expect(
      await screen.findByText(/saved locally to expense history/i),
    ).toBeInTheDocument();
  });
});
