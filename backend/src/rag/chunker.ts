/**
 * Simple, dependency-free text chunker. Splits on paragraph boundaries
 * first, then greedily packs paragraphs into chunks up to `maxChars`,
 * falling back to hard splitting for a single very long paragraph.
 * Overlap keeps context from being cut mid-thought across chunk borders.
 */
export function chunkText(text: string, maxChars = 1000, overlapChars = 150): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = current.slice(Math.max(0, current.length - overlapChars));
    }

    if (para.length > maxChars) {
      // Hard-split an oversized paragraph.
      for (let i = 0; i < para.length; i += maxChars - overlapChars) {
        chunks.push(para.slice(i, i + maxChars));
      }
      current = '';
    } else {
      current = para;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
