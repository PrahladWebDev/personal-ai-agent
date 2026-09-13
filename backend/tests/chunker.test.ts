import { chunkText } from '../src/rag/chunker';

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    const chunks = chunkText('A short paragraph about a project.', 1000);
    expect(chunks).toHaveLength(1);
  });

  it('splits long text into multiple chunks under the max size', () => {
    const longText = Array.from({ length: 50 }, (_, i) => `Paragraph number ${i} with some content.`).join('\n\n');
    const chunks = chunkText(longText, 200, 30);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(260)); // allow small overlap slack
  });
});
