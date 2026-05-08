import type {
  Document as DocxDocument,
  Paragraph as DocxParagraph,
  TextRun as DocxTextRun,
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

function segmentsToTextRuns(
  segments: TextSegment[],
  baseFontSize: number,
  TextRun: typeof DocxTextRun,
): DocxTextRun[] {
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
  const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, BorderStyle } =
    await import('docx');

  const nodes = parseResumeMarkdown(markdown);
  const paragraphs: DocxParagraph[] = [];

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
            children: segmentsToTextRuns(node.segments || [{ text: node.raw }], 11, TextRun),
          }),
        );
        break;

      case 'nested-bullet':
        paragraphs.push(
          new Paragraph({
            bullet: { level: 1 },
            spacing: { after: 40 },
            children: segmentsToTextRuns(node.segments || [{ text: node.raw }], 11, TextRun),
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
            children: segmentsToTextRuns(node.segments || [{ text: node.raw }], 11, TextRun),
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

import type { jsPDF } from 'jspdf';

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

interface StyledWord {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

function setSegmentStyle(doc: jsPDF, word: StyledWord) {
  const style = word.bold && word.italic ? 'bolditalic' : word.bold ? 'bold' : word.italic ? 'italic' : 'normal';
  doc.setFont('helvetica', style);
  if (word.italic && !word.bold) {
    doc.setTextColor(85, 85, 85);
  } else {
    doc.setTextColor(26, 26, 26);
  }
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

  const words: StyledWord[] = [];
  for (const seg of segments) {
    if (!seg.text) continue;
    for (const w of seg.text.split(/\s+/).filter((s) => s.length > 0)) {
      words.push({ text: w, bold: seg.bold, italic: seg.italic });
    }
  }
  if (words.length === 0) return y;

  doc.setFont('helvetica', 'normal');
  const spaceWidth = doc.getTextWidth(' ');

  const lines: StyledWord[][] = [[]];
  let lineWidth = 0;

  for (const word of words) {
    setSegmentStyle(doc, word);
    const wWidth = doc.getTextWidth(word.text);
    const needed = lines[lines.length - 1].length === 0 ? wWidth : spaceWidth + wWidth;

    if (lineWidth + needed > maxWidth && lines[lines.length - 1].length > 0) {
      lines.push([]);
      lineWidth = 0;
    }

    if (lines[lines.length - 1].length > 0) lineWidth += spaceWidth;
    lines[lines.length - 1].push(word);
    lineWidth += wWidth;
  }

  for (const line of lines) {
    y = addPageIfNeeded(doc, y, lineHeight);
    let lineX = x;

    for (let i = 0; i < line.length; i++) {
      if (i > 0) lineX += spaceWidth;
      setSegmentStyle(doc, line[i]);
      doc.text(line[i].text, lineX, y);
      lineX += doc.getTextWidth(line[i].text);
    }

    y += lineHeight;
  }

  return y;
}

export async function generateResumePdf(markdown: string): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import('jspdf');
  const nodes = parseResumeMarkdown(markdown);
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
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
