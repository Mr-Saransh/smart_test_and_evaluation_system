/**
 * APNI VIDYA 2.0 — MULTI-FORMAT DOCUMENT EXTRACTION SERVICE
 * 
 * Handles in-memory extraction of text from:
 * - PDF documents (.pdf)
 * - Word documents (.docx)
 * - Plain text files (.txt, .csv)
 * 
 * Ephemeral processing: Buffer is parsed in-memory and immediately freed.
 */

const zlib = require('zlib');

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
 */
async function extractPdfText(buffer) {
  ensurePdfPolyfills();
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text || '';
}

/**
 * Extracts text from a DOCX (Word) file buffer by reading its uncompressed XML content.
 * DOCX is a standard ZIP archive containing 'word/document.xml'.
 */
function extractDocxText(buffer) {
  try {
    // Basic ZIP file structure parser in pure JavaScript:
    // Local File Header Signature: 0x04034b50 (PK\x03\x04)
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
          } else if (compressionMethod === 0) { // STORED (no compression)
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
      // Fallback: try raw regex scanning on buffer if signature offset differed
      const rawString = buffer.toString('binary');
      const xmlMatch = rawString.match(/<w:document[\s\S]*?<\/w:document>/);
      if (xmlMatch) {
        return parseWordXmlToText(xmlMatch[0]);
      }
      throw new Error('Could not locate word/document.xml in DOCX file.');
    }

    const xmlString = documentXmlBuffer.toString('utf8');
    return parseWordXmlToText(xmlString);
  } catch (err) {
    throw new Error(`DOCX extraction failed: ${err.message}`);
  }
}

/**
 * Converts Word XML (<w:p>, <w:t>, <w:br>, <w:tab>) to plain text.
 */
function parseWordXmlToText(xml) {
  // Replace paragraph endings with newlines
  let text = xml
    .replace(/<w:p(?: [^>]*)?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br\s*\/?>/g, '\n')
    .replace(/<w:tab\s*\/?>/g, '\t');

  // Extract all text content from <w:t> tags
  const textRuns = [];
  const textTagRegex = /<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g;
  let match;
  
  // Alternative: Replace non-text XML tags with empty space while preserving structural newlines
  text = text.replace(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g, ' $1 ');
  text = text.replace(/<[^>]+>/g, '');

  // Decode common XML entities
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
    return extractPdfText(file.buffer);
  } else if (
    mime.includes('word') ||
    mime.includes('officedocument') ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    return extractDocxText(file.buffer);
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
