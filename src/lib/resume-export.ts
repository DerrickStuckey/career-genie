import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
} from 'docx';

export interface ResumeNode {
  type: 'name' | 'contact' | 'section' | 'text' | 'bullet' | 'nested-bullet' | 'rule';
  raw: string;
  segments?: TextSegment[];
}

export interface TextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export function parseInlineFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3]) {
      segments.push({ text: match[3], italic: true });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments;
}

export function parseResumeMarkdown(md: string): ResumeNode[] {
  const lines = md.split('\n');
  const nodes: ResumeNode[] = [];

  for (const line of lines) {
    const trimmed = line.trimEnd();

    if (trimmed === '' || trimmed === '\n') continue;

    if (/^---+$/.test(trimmed)) {
      nodes.push({ type: 'rule', raw: trimmed });
    } else if (/^# /.test(trimmed)) {
      const text = trimmed.replace(/^# /, '');
      nodes.push({ type: 'name', raw: text, segments: [{ text, bold: true }] });
    } else if (/^## /.test(trimmed)) {
      const text = trimmed.replace(/^## /, '');
      nodes.push({ type: 'section', raw: text, segments: [{ text, bold: true }] });
    } else if (/^\*[^*]/.test(trimmed) && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
      const text = trimmed.slice(1, -1);
      nodes.push({ type: 'contact', raw: text, segments: [{ text, italic: true }] });
    } else if (/^ {2,}- /.test(line) || /^\t- /.test(line)) {
      const text = line.replace(/^[\t ]*- /, '');
      nodes.push({ type: 'nested-bullet', raw: text, segments: parseInlineFormatting(text) });
    } else if (/^- /.test(trimmed)) {
      const text = trimmed.replace(/^- /, '');
      nodes.push({ type: 'bullet', raw: text, segments: parseInlineFormatting(text) });
    } else {
      nodes.push({ type: 'text', raw: trimmed, segments: parseInlineFormatting(trimmed) });
    }
  }

  return nodes;
}

function segmentsToTextRuns(segments: TextSegment[], baseFontSize: number): TextRun[] {
  return segments.map(
    (seg) =>
      new TextRun({
        text: seg.text,
        bold: seg.bold,
        italics: seg.italic,
        size: baseFontSize * 2,
        font: 'Calibri',
      }),
  );
}

export async function generateResumeDocx(markdown: string): Promise<Blob> {
  const nodes = parseResumeMarkdown(markdown);
  const paragraphs: Paragraph[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'name':
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: node.raw,
                bold: true,
                size: 28 * 2,
                font: 'Calibri',
              }),
            ],
          }),
        );
        break;

      case 'contact':
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: node.raw,
                italics: true,
                size: 10 * 2,
                font: 'Calibri',
                color: '555555',
              }),
            ],
          }),
        );
        break;

      case 'section':
        paragraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 80 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
            },
            children: [
              new TextRun({
                text: node.raw,
                bold: true,
                size: 13 * 2,
                font: 'Calibri',
              }),
            ],
          }),
        );
        break;

      case 'bullet':
        paragraphs.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: segmentsToTextRuns(node.segments || [{ text: node.raw }], 11),
          }),
        );
        break;

      case 'nested-bullet':
        paragraphs.push(
          new Paragraph({
            bullet: { level: 1 },
            spacing: { after: 40 },
            children: segmentsToTextRuns(node.segments || [{ text: node.raw }], 11),
          }),
        );
        break;

      case 'rule':
        paragraphs.push(
          new Paragraph({
            spacing: { before: 80, after: 80 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
            },
            children: [],
          }),
        );
        break;

      case 'text':
        paragraphs.push(
          new Paragraph({
            spacing: { after: 60 },
            children: segmentsToTextRuns(node.segments || [{ text: node.raw }], 11),
          }),
        );
        break;
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return Packer.toBlob(doc);
}

function markdownToHtml(md: string): string {
  const nodes = parseResumeMarkdown(md);
  const parts: string[] = [];

  for (const node of nodes) {
    const escaped = node.raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const formatted = escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

    switch (node.type) {
      case 'name':
        parts.push(`<h1>${formatted}</h1>`);
        break;
      case 'contact':
        parts.push(`<p class="contact"><em>${node.raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</em></p>`);
        break;
      case 'section':
        parts.push(`<h2>${formatted}</h2>`);
        break;
      case 'bullet':
        parts.push(`<li>${formatted}</li>`);
        break;
      case 'nested-bullet':
        parts.push(`<li class="nested">${formatted}</li>`);
        break;
      case 'rule':
        parts.push('<hr>');
        break;
      case 'text':
        parts.push(`<p>${formatted}</p>`);
        break;
    }
  }

  let html = '';
  let inList = false;
  for (const part of parts) {
    if (part.startsWith('<li')) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += part;
    } else {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += part;
    }
  }
  if (inList) html += '</ul>';

  return html;
}

const PRINT_STYLES = `
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.4; font-size: 11pt; }
  h1 { text-align: center; font-size: 24pt; margin: 0 0 4px; }
  .contact { text-align: center; color: #555; font-size: 10pt; margin: 0 0 16px; }
  h2 { font-size: 13pt; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin: 16px 0 8px; }
  ul { padding-left: 20px; margin: 4px 0; }
  li { margin: 2px 0; }
  li.nested { margin-left: 16px; }
  hr { border: none; border-top: 1px solid #aaa; margin: 12px 0; }
  p { margin: 4px 0; }
  strong { font-weight: 600; }
  em { font-style: italic; color: #555; }
  @media print { body { padding: 0; } }
`;

export function openResumePrintView(markdown: string): void {
  const html = markdownToHtml(markdown);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Resume</title><style>${PRINT_STYLES}</style></head>
<body>${html}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
