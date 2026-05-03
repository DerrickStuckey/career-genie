const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validateFileSize(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File is too large. Maximum size is 10 MB.');
  }
}

export async function extractTextFromPDF(file: File): Promise<string> {
  validateFileSize(file);

  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(text);
  }

  const result = pageTexts.join('\n\n').trim();
  if (!result) {
    throw new Error('No text could be extracted from this PDF. It may be a scanned/image-only document.');
  }
  return result;
}

export async function extractTextFromDOCX(file: File): Promise<string> {
  validateFileSize(file);

  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });

  const result = value.trim();
  if (!result) {
    throw new Error('No text could be extracted from this DOCX file.');
  }
  return result;
}
