import fs from 'fs/promises';
import ejs from 'ejs';
import { pdfTemplateFile } from './paths';

const cache = new Map<string, string>();

export async function renderPdfTemplate(
  fileName: string,
  data: Record<string, unknown>,
): Promise<string> {
  const filePath = pdfTemplateFile(fileName);
  let source = cache.get(filePath);

  if (!source) {
    source = await fs.readFile(filePath, 'utf8');
    if (process.env.NODE_ENV === 'production') {
      cache.set(filePath, source);
    }
  }

  return ejs.render(source, data, { filename: filePath });
}