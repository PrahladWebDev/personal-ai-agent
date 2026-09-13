import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import { ApiError } from '../middleware/errorHandler';

export async function extractText(filePath: string, fileType: string): Promise<string> {
  switch (fileType) {
    case 'txt':
    case 'md':
      return fs.readFile(filePath, 'utf-8');

    case 'docx': {
      const buffer = await fs.readFile(filePath);
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    }

    case 'pdf': {
      const pdfParse = (await import('pdf-parse')).default;
      const buffer = await fs.readFile(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    }

    default:
      throw new ApiError(`Unsupported file type: ${path.extname(filePath)}`, 400, 'UNSUPPORTED_FILE_TYPE');
  }
}

export function cleanText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
