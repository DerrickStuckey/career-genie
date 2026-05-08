import { describe, it, expect } from 'vitest';
import { parseResumeMarkdown, parseInlineFormatting, generateResumeDocx } from '../resume-export';

describe('parseInlineFormatting', () => {
  it('parses bold text', () => {
    const result = parseInlineFormatting('**Software Engineer** at Google');
    expect(result).toEqual([
      { text: 'Software Engineer', bold: true },
      { text: ' at Google' },
    ]);
  });

  it('parses italic text', () => {
    const result = parseInlineFormatting('*City, ST | 555-1234*');
    expect(result).toEqual([{ text: 'City, ST | 555-1234', italic: true }]);
  });

  it('handles plain text', () => {
    const result = parseInlineFormatting('Just plain text');
    expect(result).toEqual([{ text: 'Just plain text' }]);
  });

  it('handles multiple bold segments', () => {
    const result = parseInlineFormatting('**Role** at **Company** (2020-2024)');
    expect(result).toEqual([
      { text: 'Role', bold: true },
      { text: ' at ' },
      { text: 'Company', bold: true },
      { text: ' (2020-2024)' },
    ]);
  });
});

describe('parseResumeMarkdown', () => {
  const sampleResume = `# Jane Doe
*San Francisco, CA | jane@example.com | 555-0123*

---

## Experience

- **Senior Engineer** at **Acme Corp** (2021-Present)
  - Led team of 5 engineers
  - Improved performance by 40%
- **Engineer** at **StartupCo** (2018-2021)
  - Built core platform features

## Education

- **B.S. Computer Science**, MIT (2018)

## Skills

- TypeScript, React, Node.js, PostgreSQL`;

  it('identifies the name heading', () => {
    const nodes = parseResumeMarkdown(sampleResume);
    expect(nodes[0]).toEqual({
      type: 'name',
      raw: 'Jane Doe',
      segments: [{ text: 'Jane Doe', bold: true }],
    });
  });

  it('identifies contact info', () => {
    const nodes = parseResumeMarkdown(sampleResume);
    expect(nodes[1]).toEqual({
      type: 'contact',
      raw: 'San Francisco, CA | jane@example.com | 555-0123',
      segments: [{ text: 'San Francisco, CA | jane@example.com | 555-0123', italic: true }],
    });
  });

  it('identifies horizontal rules', () => {
    const nodes = parseResumeMarkdown(sampleResume);
    const rules = nodes.filter((n) => n.type === 'rule');
    expect(rules.length).toBe(1);
  });

  it('identifies section headers', () => {
    const nodes = parseResumeMarkdown(sampleResume);
    const sections = nodes.filter((n) => n.type === 'section');
    expect(sections.map((s) => s.raw)).toEqual(['Experience', 'Education', 'Skills']);
  });

  it('identifies bullets and nested bullets', () => {
    const nodes = parseResumeMarkdown(sampleResume);
    const bullets = nodes.filter((n) => n.type === 'bullet');
    const nested = nodes.filter((n) => n.type === 'nested-bullet');
    expect(bullets.length).toBe(4);
    expect(nested.length).toBe(3);
  });

  it('parses inline formatting in bullets', () => {
    const nodes = parseResumeMarkdown(sampleResume);
    const firstBullet = nodes.find((n) => n.type === 'bullet');
    expect(firstBullet?.segments).toEqual([
      { text: 'Senior Engineer', bold: true },
      { text: ' at ' },
      { text: 'Acme Corp', bold: true },
      { text: ' (2021-Present)' },
    ]);
  });
});

describe('generateResumeDocx', () => {
  it('returns a Blob', async () => {
    const md = `# Test Person
*test@email.com*

## Experience

- **Developer** at **Company** (2020-2024)
  - Did great work`;

    const blob = await generateResumeDocx(md);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
});
