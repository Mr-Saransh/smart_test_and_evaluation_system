/**
 * APNI VIDYA 2.0 — MULTI-FORMAT DOCUMENT EXTRACTION SERVICE
 * 
 * Handles in-memory extraction of text from:
 * - PDF documents (.pdf)
 * - Word documents (.docx, .doc)
 * - Plain text files (.txt, .csv)
 * 
 * Ephemeral processing: Buffer is parsed in-memory and immediately freed.
 */

const zlib = require('zlib');
let mammoth;
try {
  mammoth = require('mammoth');
} catch (_) {
  mammoth = null;
}

/**
 * Polyfill browser canvas / DOM globals required by PDF.js in headless Node environments.
 */
function ensurePdfPolyfills() {
  if (typeof global.DOMMatrix === 'undefined') global.DOMMatrix = class DOMMatrix {};
  if (typeof global.ImageData === 'undefined') global.ImageData = class ImageData {};
  if (typeof global.Path2D === 'undefined') global.Path2D = class Path2D {};
}

/**
 * Extracts plain text from a PDF buffer.
 * Compatible with both pdf-parse v2 (class-based) and pdf-parse v1 (function-based).
 */
async function extractPdfText(buffer) {
  ensurePdfPolyfills();
  try {
    const pdfModule = require('pdf-parse');

    // 1. pdf-parse v2.x (exports PDFParse class)
    if (pdfModule && pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      try {
        const data = await parser.getText();
        if (data && typeof data.text === 'string') {
          return data.text;
        }
        return '';
      } finally {
        if (typeof parser.destroy === 'function') {
          try { await parser.destroy(); } catch (_) {}
        }
      }
    }

    // 2. pdf-parse v1.x (direct callable function)
    if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      return (data && data.text) ? data.text : '';
    }

    // 3. Default export fallback
    if (pdfModule && typeof pdfModule.default === 'function') {
      const data = await pdfModule.default(buffer);
      return (data && data.text) ? data.text : '';
    }

    throw new Error('Unsupported pdf-parse module format');
  } catch (err) {
    throw new Error(`PDF text extraction failed: ${err.message}`);
  }
}

/**
 * Fallback ZIP file decompressor for DOCX word/document.xml
 */
function extractDocxFromZipBuffer(buffer) {
  let offset = 0;
  let documentXmlBuffer = null;

  while (offset < buffer.length - 30) {
    const signature = buffer.readUInt32LE(offset);
    if (signature === 0x04034b50) {
      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);
      
      const fileNameStart = offset + 30;
      const fileName = buffer.toString('utf8', fileNameStart, fileNameStart + fileNameLength);
      const dataStart = fileNameStart + fileNameLength + extraFieldLength;

      if (fileName === 'word/document.xml') {
        const compressedData = buffer.slice(dataStart, dataStart + compressedSize);
        if (compressionMethod === 8) { // DEFLATE
          documentXmlBuffer = zlib.inflateRawSync(compressedData);
        } else if (compressionMethod === 0) { // STORED
          documentXmlBuffer = compressedData;
        }
        break;
      }

      offset = dataStart + compressedSize;
    } else {
      offset++;
    }
  }

  if (!documentXmlBuffer) {
    const rawString = buffer.toString('binary');
    const xmlMatch = rawString.match(/<w:document[\s\S]*?<\/w:document>/);
    if (xmlMatch) {
      return parseWordXmlToText(xmlMatch[0]);
    }
    throw new Error('Could not locate word/document.xml in DOCX file.');
  }

  const xmlString = documentXmlBuffer.toString('utf8');
  return parseWordXmlToText(xmlString);
}

/**
 * Extracts text from a DOCX (Word) file buffer using mammoth with ZIP fallback.
 */
async function extractDocxText(buffer) {
  // 1. Primary: Mammoth parser
  if (mammoth && typeof mammoth.extractRawText === 'function') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result && typeof result.value === 'string' && result.value.trim().length > 0) {
        return result.value;
      }
    } catch (mErr) {
      console.warn('Mammoth extraction fallback:', mErr.message);
    }
  }

  // 2. Fallback: Pure JS ZIP decompressor
  try {
    return extractDocxFromZipBuffer(buffer);
  } catch (err) {
    throw new Error(`DOCX extraction failed: ${err.message}`);
  }
}

/**
 * Converts Word XML (<w:p>, <w:t>, <w:br>, <w:tab>) to plain text.
 */
function parseWordXmlToText(xml) {
  let text = xml
    .replace(/<w:p(?: [^>]*)?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br\s*\/?>/g, '\n')
    .replace(/<w:tab\s*\/?>/g, '\t');

  text = text.replace(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g, ' $1 ');
  text = text.replace(/<[^>]+>/g, '');

  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  return text;
}

/**
 * Dispatches document buffer to the appropriate parser based on file type / mime.
 */
async function extractDocumentText(file) {
  if (!file || !file.buffer) {
    throw new Error('No file buffer provided for extraction.');
  }

  const mime = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();

  if (mime.includes('pdf') || name.endsWith('.pdf')) {
    return await extractPdfText(file.buffer);
  } else if (
    mime.includes('word') ||
    mime.includes('officedocument') ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    return await extractDocxText(file.buffer);
  } else {
    // Plain text / CSV / JSON
    return file.buffer.toString('utf8');
  }
}

module.exports = {
  extractDocumentText,
  extractPdfText,
  extractDocxText,
  parseWordXmlToText
};

