import fs from 'fs/promises';
import ejs from 'ejs';
import { pdfTemplateFile } from './paths';

export async function renderPdfTemplate(
  fileName: string,
  data: Record<string, unknown>,
): Promise<string> {
  const filePath = pdfTemplateFile(fileName);
  const source = await fs.readFile(filePath, 'utf8');
  return ejs.render(source, data, { filename: filePath });
}