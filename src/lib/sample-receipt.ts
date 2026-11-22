export async function loadSampleReceiptImage(): Promise<File> {
  const response = await fetch('/sample-receipt.svg', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('The fictional sample receipt could not be loaded.');
  }

  const imageUrl = URL.createObjectURL(await response.blob());
  try {
    return await new Promise<File>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (!image.naturalWidth || !image.naturalHeight) {
          reject(new Error('The fictional sample receipt has no image data.'));
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('This browser cannot prepare the sample receipt.'));
          return;
        }

        context.drawImage(image, 0, 0);
        canvas.toBlob((png) => {
          if (!png) {
            reject(new Error('This browser could not prepare the sample receipt.'));
            return;
          }
          resolve(new File([png], 'synthetic-sample-receipt.png', { type: 'image/png' }));
        }, 'image/png');
      };
      image.onerror = () => reject(new Error('The fictional sample receipt could not be decoded.'));
      image.src = imageUrl;
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
