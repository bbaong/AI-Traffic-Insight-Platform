import path from 'path';

export const PDF_TEMPLATE_DIR = path.join(process.cwd(), 'templates', 'pdf');

export function pdfTemplateFile(name: string): string {
  return path.join(PDF_TEMPLATE_DIR, name);
}