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
 * Helper to unescape string literals in PDF syntax.
 */
function unescapePdfString(str) {
  if (!str) return '';
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\(.)/g, '$1');
}

/**
 * Pure JavaScript fallback PDF stream & content extractor.
 * Decompresses stream chunks using built-in zlib and parses text drawing operators
 * (BT/ET, Tj, TJ, hex strings, etc.) without requiring external workers or native dependencies.
 */
function extractPdfTextPureJs(buffer) {
  const content = buffer.toString('binary');
  const extracted = [];

  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match;

  while ((match = streamRegex.exec(content)) !== null) {
    const rawStream = match[1];
    const streamData = Buffer.from(rawStream, 'binary');
    let textChunk = '';

    // Try inflating standard FlateDecode compression
    try {
      const decompressed = zlib.inflateSync(streamData);
      textChunk = decompressed.toString('latin1');
    } catch (_) {
      try {
        const decompressed = zlib.inflateRawSync(streamData);
        textChunk = decompressed.toString('latin1');
      } catch (_) {
        textChunk = rawStream;
      }
    }

    // Extract text from text blocks BT ... ET
    const btRegex = /BT[\s\S]*?ET/g;
    let btMatch;
    while ((btMatch = btRegex.exec(textChunk)) !== null) {
      const block = btMatch[0];

      // Match (string) Tj or ' or "
      const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|'|")/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const str = unescapePdfString(tjMatch[1]);
        if (str.trim()) extracted.push(str.trim());
      }

      // Match array [...] TJ
      const arrayTjRegex = /\[([\s\S]*?)\]\s*TJ/g;
      let atjMatch;
      while ((atjMatch = arrayTjRegex.exec(block)) !== null) {
        const inner = atjMatch[1];
        const strRegex = /\(((?:[^()\\]|\\.)*)\)/g;
        let sMatch;
        const lineParts = [];
        while ((sMatch = strRegex.exec(inner)) !== null) {
          lineParts.push(unescapePdfString(sMatch[1]));
        }
        const joined = lineParts.join(' ').trim();
        if (joined) extracted.push(joined);
      }

      // Match hex string <48656c6c6f> Tj
      const hexTjRegex = /<([0-9a-fA-F\s]+)>\s*(?:Tj|'|")/g;
      let hexMatch;
      while ((hexMatch = hexTjRegex.exec(block)) !== null) {
        const hex = hexMatch[1].replace(/\s+/g, '');
        if (hex.length % 2 === 0) {
          try {
            const str = Buffer.from(hex, 'hex').toString('utf8').trim();
            if (str) extracted.push(str);
          } catch (_) {}
        }
      }
    }
  }

  return extracted.join('\n');
}

/**
 * Extracts plain text from a PDF buffer.
 * Multi-layer execution:
 * 1. unpdf (Serverless-native, edge-ready, zero-worker, zero-canvas)
 * 2. Pure JS stream extractor (Zero-dependency zlib FlateDecode + PDF operator parser)
 * 3. pdf-parse fallback (legacy compatibility wrapped in safe try/catch)
 * 4. Raw printable token scan
 */
async function extractPdfText(buffer) {
  ensurePdfPolyfills();

  // Tier 1: Primary unpdf engine (Serverless safe)
  try {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const res = await extractText(pdf, { mergePages: true });
    const text = typeof res.text === 'string' ? res.text : (Array.isArray(res.text) ? res.text.join('\n\n') : '');
    if (text && text.trim().length > 0) {
      return text;
    }
  } catch (unpdfErr) {
    console.warn('unpdf extraction tier failed, attempting fallback:', unpdfErr.message);
  }

  // Tier 2: Pure JS zlib stream extractor (Immune to worker/environment issues)
  try {
    const pureText = extractPdfTextPureJs(buffer);
    if (pureText && pureText.trim().length > 0) {
      return pureText;
    }
  } catch (pureErr) {
    console.warn('Pure JS PDF extraction tier failed, attempting fallback:', pureErr.message);
  }

  // Tier 3: pdf-parse fallback
  try {
    const pdfModule = require('pdf-parse');
    if (pdfModule && pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      try {
        const data = await parser.getText();
        if (data && typeof data.text === 'string' && data.text.trim()) {
          return data.text;
        }
      } finally {
        if (typeof parser.destroy === 'function') {
          try { await parser.destroy(); } catch (_) {}
        }
      }
    } else if (typeof pdfModule === 'function') {
      const data = await pdfModule(buffer);
      if (data && data.text && data.text.trim()) {
        return data.text;
      }
    }
  } catch (pdfParseErr) {
    console.warn('pdf-parse fallback tier failed:', pdfParseErr.message);
  }

  // Tier 4: Raw printable text sequence extraction
  const rawString = buffer.toString('utf8');
  const printableMatches = rawString.match(/[A-Za-z0-9\s.,?!:;'"()\-+/*=<>]{15,}/g);
  if (printableMatches && printableMatches.length > 0) {
    return printableMatches.join('\n');
  }

  throw new Error('No readable text could be extracted from the document. The file may be an image-only scan, password-protected, or empty.');
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
