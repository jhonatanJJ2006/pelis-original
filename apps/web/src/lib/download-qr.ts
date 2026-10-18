import QRCode from 'qrcode';

/** QR (librería `qrcode`) como data URL SVG: nítido a cualquier tamaño, sin peticiones extra. */
export async function downloadQrDataUrl(text: string): Promise<string | null> {
  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0e0e10', light: '#f2eee6' },
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}
