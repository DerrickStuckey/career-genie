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

import { jsPDF } from 'jspdf';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

function addPageIfNeeded(doc: jsPDF, y: number, lineHeight: number): number {
  if (y + lineHeight > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function renderSegments(
  doc: jsPDF,
  segments: TextSegment[],
  x: number,
  y: number,
  fontSize: number,
  maxWidth: number,
): number {
  doc.setFontSize(fontSize);
  const lineHeight = fontSize * 0.45;

  const fullText = segments.map((s) => s.text).join('');
  const wrappedLines = doc.splitTextToSize(fullText, maxWidth) as string[];

  for (const line of wrappedLines) {
    y = addPageIfNeeded(doc, y, lineHeight);

    let lineX = x;
    let remaining = line;

    for (const seg of segments) {
      if (!remaining || !seg.text) continue;

      let chunk = '';
      if (remaining.startsWith(seg.text)) {
        chunk = seg.text;
        remaining = remaining.slice(chunk.length);
      } else if (seg.text.startsWith(remaining)) {
        chunk = remaining;
        remaining = '';
      } else {
        const idx = remaining.indexOf(seg.text);
        if (idx === 0) {
          chunk = seg.text;
          remaining = remaining.slice(chunk.length);
        } else if (idx > 0) {
          continue;
        } else {
          const overlap = seg.text.slice(0, remaining.length);
          if (remaining.startsWith(overlap)) {
            chunk = remaining;
            remaining = '';
          } else {
            continue;
          }
        }
      }

      if (!chunk) continue;

      const style = seg.bold && seg.italic ? 'bolditalic' : seg.bold ? 'bold' : seg.italic ? 'italic' : 'normal';
      doc.setFont('helvetica', style);
      if (seg.italic && !seg.bold) {
        doc.setTextColor(85, 85, 85);
      } else {
        doc.setTextColor(26, 26, 26);
      }
      doc.text(chunk, lineX, y);
      lineX += doc.getTextWidth(chunk);
    }

    y += lineHeight;
  }

  return y;
}

export function generateResumePdf(markdown: string): jsPDF {
  const nodes = parseResumeMarkdown(markdown);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = MARGIN;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(26, 26, 26);

  for (const node of nodes) {
    switch (node.type) {
      case 'name': {
        y = addPageIfNeeded(doc, y, 12);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 26);
        doc.text(node.raw, PAGE_WIDTH / 2, y, { align: 'center' });
        y += 8;
        break;
      }

      case 'contact': {
        y = addPageIfNeeded(doc, y, 6);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(85, 85, 85);
        doc.text(node.raw, PAGE_WIDTH / 2, y, { align: 'center' });
        y += 6;
        break;
      }

      case 'section': {
        y += 3;
        y = addPageIfNeeded(doc, y, 8);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 26, 26);
        doc.text(node.raw, MARGIN, y);
        y += 1;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        y += 4;
        break;
      }

      case 'bullet': {
        y = addPageIfNeeded(doc, y, 5);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 26, 26);
        doc.text('•', MARGIN + 2, y);
        const bulletIndent = MARGIN + 6;
        y = renderSegments(doc, node.segments || [{ text: node.raw }], bulletIndent, y, 9.5, CONTENT_WIDTH - 6);
        y += 0.5;
        break;
      }

      case 'nested-bullet': {
        y = addPageIfNeeded(doc, y, 5);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 26, 26);
        doc.text('–', MARGIN + 8, y);
        const nestedIndent = MARGIN + 12;
        y = renderSegments(doc, node.segments || [{ text: node.raw }], nestedIndent, y, 9.5, CONTENT_WIDTH - 12);
        y += 0.5;
        break;
      }

      case 'rule': {
        y += 2;
        y = addPageIfNeeded(doc, y, 4);
        doc.setDrawColor(170, 170, 170);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        y += 4;
        break;
      }

      case 'text': {
        y = addPageIfNeeded(doc, y, 5);
        y = renderSegments(doc, node.segments || [{ text: node.raw }], MARGIN, y, 9.5, CONTENT_WIDTH);
        y += 1;
        break;
      }
    }
  }

  return doc;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
