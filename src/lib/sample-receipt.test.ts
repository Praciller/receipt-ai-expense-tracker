import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSampleReceiptImage } from './sample-receipt';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('loadSampleReceiptImage', () => {
  it('rasterizes the fictional SVG as a PNG accepted by the parse API', async () => {
    const svg = readFileSync('public/sample-receipt.svg', 'utf8');
    const { documentElement } = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const drawImage = vi.fn();
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('Image', class {
      naturalWidth = Number(documentElement.getAttribute('width'));
      naturalHeight = Number(documentElement.getAttribute('height'));
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    });
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:synthetic-sample'),
      revokeObjectURL,
    }));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(svg, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      }),
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback) {
      expect(this.width).toBe(1280);
      expect(this.height).toBe(1600);
      callback(new Blob(['png-image-bytes'], { type: 'image/png' }));
    });

    const sample = await loadSampleReceiptImage();

    expect(sample.name).toBe('synthetic-sample-receipt.png');
    expect(sample.type).toBe('image/png');
    expect(sample.size).toBeGreaterThan(0);
    expect(drawImage).toHaveBeenCalledWith(expect.any(Image), 0, 0);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-sample');
  });

  it('reports a missing public sample image without producing a file', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    await expect(loadSampleReceiptImage()).rejects.toThrow(/sample receipt could not be loaded/i);
  });
});
