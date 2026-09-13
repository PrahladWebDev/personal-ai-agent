// `pdf-parse` ships no type declarations and no `@types/pdf-parse` package
// exists on npm. This is a minimal ambient declaration covering the one
// function this project actually calls (see `src/documents/extractText.ts`).
declare module 'pdf-parse' {
  interface PDFParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFParseResult>;

  export default pdfParse;
}
