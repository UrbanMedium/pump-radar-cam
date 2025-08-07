import Tesseract from 'tesseract.js'

export async function ocrImage(image: HTMLImageElement | HTMLCanvasElement | Blob): Promise<string> {
  // Use top-level recognize with explicit language to satisfy v5 typings
  const { data: { text } } = await Tesseract.recognize(image as any, 'eng', { logger: _m => {} });
  return text || '';
}

export function extractQueryFromText(text: string): string {
  // Try to find set number pattern like 214/162
  const numMatch = text.match(/\b(\d{1,3}\/\d{1,3})\b/);
  // Try to find likely name tokens (first line with letters, ignoring common words)
  const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  let name = '';
  for (const line of lines) {
    if (/ex|gx|vmax|v-star|illustration|rare|trainer|energy/i.test(line)) continue;
    if (line.length >= 3 && /[A-Za-z]/.test(line)) { name = line.replace(/[^A-Za-z '-]/g,'').trim(); break; }
  }
  const parts = [name];
  if (numMatch) parts.push(numMatch[1]);
  return parts.filter(Boolean).join(' ').trim();
}
