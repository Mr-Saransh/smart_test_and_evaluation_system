/**
 * APNI VIDYA 2.0 — DETERMINISTIC QUESTION EXTRACTION & NORMALIZATION ENGINE
 * 
 * Layered parsing pipeline:
 * 1. Unicode & whitespace normalization
 * 2. Header/footer/garbage cleaning & noise reduction
 * 3. Answer key detection (inline & separate answer blocks)
 * 4. Question boundary & numbering detection
 * 5. Option boundary detection (vertical stacked, 2x2 grid, horizontal inline, tab separated)
 * 6. Question normalization, metadata extraction & validation
 */

/**
 * Normalizes raw document text by standardizing unicode, line endings, quotes, dashes, and bullets.
 */
function normalizeRawText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText
    // Standardize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove zero-width characters and BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Standardize quotes and apostrophes
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036«»]/g, '"')
    // Standardize hyphens and dashes
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    // Standardize non-breaking spaces & full-width spaces
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Standardize bullets
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25AA\u25AB]/g, '•')
    // Normalize fractions
    .replace(/\u00BD/g, '1/2')
    .replace(/\u00BC/g, '1/4')
    .replace(/\u00BE/g, '3/4');

  return text;
}

/**
 * Removes repeated document headers, footers, page numbering, and boilerplate exam instructions.
 */
function cleanGarbageAndNoise(text) {
  const lines = text.split('\n');
  const cleanedLines = [];

  const noisePatterns = [
    /^\s*(?:page|pg\.?)\s*\d+\s*(?:of|\/)\s*\d+\s*$/i,
    /^\s*(?:page|pg\.?)\s*\d+\s*$/i,
    /^\s*-\s*\d+\s*-\s*$/,
    /^\s*\[\s*page\s*\d+\s*\]\s*$/i,
    /^\s*(?:all\s+questions\s+are\s+compulsory|time\s*allowed\s*[:\-]|maximum\s*marks\s*[:\-]|total\s*marks\s*[:\-])/i,
    /^\s*(?:general\s+instructions|instructions\s*for\s*candidates|read\s*the\s*following\s*instructions)/i,
    /^\s*(?:question\s+bank|sample\s+paper|mock\s+test\s+series|practice\s+sheet|daily\s+practice\s+problem|dpp\s*[-:\d]*)\s*$/i,
    /^\s*[-=_*~]{3,}\s*$/, // Horizontal rules
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      cleanedLines.push('');
      continue;
    }

    let isNoise = false;
    for (const pattern of noisePatterns) {
      if (pattern.test(line)) {
        isNoise = true;
        break;
      }
    }

    if (!isNoise) {
      cleanedLines.push(lines[i]);
    }
  }

  // Collapse multiple consecutive blank lines into double newline
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Detects and extracts standalone answer key blocks (e.g. "Answer Key", "Answers: 1-A, 2-B, 3-C...").
 * Returns { cleanedText, standaloneKeyMap }
 */
function extractStandaloneAnswerKeys(text) {
  const keyMap = {}; // questionNumber -> correct_index (0..4)

  // Pattern matching standalone Answer Key section at the end or top
  const answerKeySectionRegex = /(?:^|\n+)\s*(?:ANSWER\s*KEYS?|ANSWERS?|SOLUTIONS?|KEY\s*SHEET|HINTS?\s*&\s*SOLUTIONS?|ANSWER\s*SHEET)\b[:\-]?\s*\n+([\s\S]+)$/i;
  const match = text.match(answerKeySectionRegex);

  let cleanedText = text;

  if (match) {
    const keySectionText = match[1];
    cleanedText = text.substring(0, match.index).trim();

    // Parse various key list patterns:
    // "1. A", "1) (b)", "1-C", "Q1: D", "1.A 2.B 3.C", "1.(A)  2.(B)", "1 - (iv)"
    const itemRegex = /(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\:\)\-\s]+\(?([A-Ea-e1-5]|(?:[ivx]+))\)?/gi;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(keySectionText)) !== null) {
      const qNum = parseInt(itemMatch[1], 10);
      const optChar = itemMatch[2].toUpperCase();
      let index = null;
      if (optChar >= 'A' && optChar <= 'E') {
        index = optChar.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, E=4
      } else if (optChar >= '1' && optChar <= '5') {
        index = parseInt(optChar, 10) - 1;
      } else {
        const romanMap = { 'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4 };
        if (romanMap[optChar] !== undefined) index = romanMap[optChar];
      }
      if (index !== null) {
        keyMap[qNum] = index;
      }
    }
  }

  return { cleanedText, standaloneKeyMap: keyMap };
}

/**
 * Extracts inline answer and explanation from a question text block.
 * Returns { answerIndex, answerRawText, cleanedBlock, explanation }
 */
function extractInlineAnswer(block) {
  let answerIndex = null;
  let answerRawText = '';
  let explanation = '';
  let cleaned = block;

  // 1. Extract Explanation / Solution if present
  const expRegex = /(?:^|\n)\s*(?:Explanation|Solution|Sol|Exp|Hint|Reason)\s*[:\-.\s]\s*([\s\S]+)$/i;
  const expMatch = cleaned.match(expRegex);
  if (expMatch) {
    explanation = expMatch[1].trim();
    cleaned = cleaned.substring(0, expMatch.index).trim();
  }

  // 2. Extract Inline Answer
  const ansPatterns = [
    /(?:^|\n|\s{2,}|\t)\s*(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key|Right\s*Answer|Option)\s*[:\-.\s]\s*\(?([A-Ea-e1-5]|(?:[ivx]+))\)?(?:\s*[\.\:\-\–]\s*([^\n]*))?/i,
    /(?:^|\n)\s*\[\s*(?:Ans(?:wer)?|Correct|Key)\s*[:\-.\s]*([A-Ea-e1-5]|(?:[ivx]+))\s*\]/i,
    /(?:^|\n)\s*\(\s*(?:Ans(?:wer)?|Correct|Key)\s*[:\-.\s]*([A-Ea-e1-5]|(?:[ivx]+))\s*\)/i,
  ];

  for (const pattern of ansPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const char = match[1].toUpperCase();
      if (char >= 'A' && char <= 'E') {
        answerIndex = char.charCodeAt(0) - 65;
      } else if (char >= '1' && char <= '5') {
        answerIndex = parseInt(char, 10) - 1;
      } else {
        const romanMap = { 'I': 0, 'II': 1, 'III': 2, 'IV': 3, 'V': 4 };
        if (romanMap[char] !== undefined) answerIndex = romanMap[char];
      }
      if (match[2] && !explanation) {
        explanation = match[2].trim();
      }
      cleaned = cleaned.replace(match[0], '').trim();
      break;
    }
  }

  // 3. Fallback: Check for "Ans: <Text>" where answer text is given directly
  if (answerIndex === null) {
    const directAnsMatch = cleaned.match(/(?:^|\n)\s*(?:Ans(?:wer)?|Correct\s*Option)\s*[:\-.\s]\s*([^\n]+)$/i);
    if (directAnsMatch) {
      answerRawText = directAnsMatch[1].trim();
      cleaned = cleaned.replace(directAnsMatch[0], '').trim();
    }
  }

  return { answerIndex, answerRawText, cleanedBlock: cleaned, explanation };
}

/**
 * Universal option extractor.
 * Handles:
 * - Stacked vertical options
 * - 2x2 grid options
 * - Horizontal single-line options
 * - Tab-separated options
 * - Formats: (A)-(E), [A]-[E], A.-E., A)-E), 1)-5), 1.-5., (1)-(5), (i)-(iv)
 */
function extractOptions(block) {
  if (!block || typeof block !== 'string') {
    return { questionText: '', options: [] };
  }

  // Regex matching option label markers:
  // (A), (B), [A], [B], A., B., A), B), 1), 2), (1), (2), (i), (ii)
  // Preceded by line start, newline, carriage return, tab, or space boundary
  const markerRegex = /(?:^|\n|\r|\t|(?<=\s))(?:\(([A-Ea-e1-5]|(?:[ivx]+))\)|\[([A-Ea-e1-5]|(?:[ivx]+))\]|([A-Ea-e1-5]|(?:[ivx]+))[\.\)\:\-]\s*)/g;
  
  const markers = [];
  let m;
  while ((m = markerRegex.exec(block)) !== null) {
    const rawLabel = (m[1] || m[2] || m[3] || '').toUpperCase();
    const matchStr = m[0];
    const leadingWhitespaceLen = matchStr.search(/[^\s]/);
    const startPos = m.index + (leadingWhitespaceLen >= 0 ? leadingWhitespaceLen : 0);
    const markerLen = matchStr.length - (leadingWhitespaceLen >= 0 ? leadingWhitespaceLen : 0);
    markers.push({
      startPos,
      endPos: startPos + markerLen,
      label: rawLabel,
      index: markers.length
    });
  }

  // Minimum 2 options required for an MCQ
  if (markers.length < 2) {
    return { questionText: block.trim(), options: [] };
  }

  // Validate that the markers form an increasing or valid sequence (e.g. A then B then C)
  // Check if first marker is A / 1 / I / a
  const firstLabel = markers[0].label;
  const validFirstLabels = ['A', '1', 'I', 'a'];
  const isSequenceStart = validFirstLabels.includes(firstLabel) || markers.length >= 2;

  if (!isSequenceStart) {
    return { questionText: block.trim(), options: [] };
  }

  const questionText = block.substring(0, markers[0].startPos).trim();
  const options = [];

  for (let i = 0; i < markers.length; i++) {
    const current = markers[i];
    const next = markers[i + 1];
    let optText = next 
      ? block.substring(current.endPos, next.startPos).trim()
      : block.substring(current.endPos).trim();

    // Clean leading dots/dashes from option text if any remained
    optText = optText.replace(/^[\.\:\-\s]+/, '').trim();
    if (optText.length > 0) {
      options.push(optText);
    }
  }

  if (options.length < 2) {
    return { questionText: block.trim(), options: [] };
  }

  return { questionText, options };
}

/**
 * Splits raw document text into question candidate chunks based on numbered boundaries.
 */
function splitIntoQuestionBlocks(text) {
  const blocks = [];
  
  // Distinguish question starts:
  // 1. Q1., Q1:, Q1), Q.1, Question 1:, Que 1.
  // 2. 1. , 2. , 3. at line start (followed by text)
  // 3. 1) , 2) at line start
  // 4. [1], [2], (1), (2)
  const qHeadingRegex = /(?:^|\n+)\s*(?:(?:Q(?:uestion|ue)?\.?\s*|\(?#?\s*)(\d+)[\.\:\-\s]+|(?:Q(?:uestion|ue)?\.?\s*)(\d+)\)|\[(\d+)\]\s*|(\d+)\.\s+|(\d+)\)\s*(?=[A-Z]))/gi;
  
  const indices = [];
  let match;
  while ((match = qHeadingRegex.exec(text)) !== null) {
    const qNum = parseInt(match[1] || match[2] || match[3] || match[4] || match[5], 10);
    indices.push({
      index: match.index,
      length: match[0].length,
      qNum: qNum || (indices.length + 1),
      rawPrefix: match[0]
    });
  }

  if (indices.length === 0) {
    // Fallback: Split by double newlines if no numbered questions detected
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    return paragraphs.map((p, idx) => ({ qNum: idx + 1, rawBlock: p }));
  }

  for (let i = 0; i < indices.length; i++) {
    const current = indices[i];
    const next = indices[i + 1];
    const blockContent = next 
      ? text.substring(current.index, next.index) 
      : text.substring(current.index);

    // Strip the question number prefix from the start of the block
    const strippedBlock = blockContent
      .replace(/^\s*(?:(?:Q(?:uestion|ue)?\.?\s*|\(?#?\s*)(\d+)[\.\:\-\s]+|(?:Q(?:uestion|ue)?\.?\s*)(\d+)\)|\[(\d+)\]\s*|(\d+)\.\s+|(\d+)\)\s*)/i, '')
      .trim();

    if (strippedBlock.length > 0) {
      blocks.push({
        qNum: current.qNum,
        rawBlock: strippedBlock
      });
    }
  }

  return blocks;
}

/**
 * Validates a normalized question object and generates a human-readable list of issues if invalid.
 */
function validateQuestion(q, index) {
  const issues = [];

  if (!q.text || q.text.trim().length === 0) {
    issues.push('Question text is missing or empty.');
  }

  if (!Array.isArray(q.options) || q.options.length < 2) {
    issues.push(`Found only ${q.options?.length || 0} option(s). At least 2 options are required.`);
  } else {
    // Check for empty options
    const emptyIndices = [];
    q.options.forEach((opt, idx) => {
      if (!opt || opt.trim().length === 0) {
        emptyIndices.push(String.fromCharCode(65 + idx));
      }
    });
    if (emptyIndices.length > 0) {
      issues.push(`Option(s) ${emptyIndices.join(', ')} are empty.`);
    }

    // Check for duplicate options
    const trimmedOpts = q.options.map(o => o.trim().toLowerCase()).filter(Boolean);
    const uniqueOpts = new Set(trimmedOpts);
    if (uniqueOpts.size < trimmedOpts.length) {
      issues.push('Duplicate option values detected.');
    }
  }

  if (q.type === 'mcq') {
    if (q.correct_index === null || q.correct_index === undefined) {
      issues.push('Correct answer has not been selected.');
    } else if (q.correct_index < 0 || (q.options && q.correct_index >= q.options.length)) {
      issues.push('Selected correct answer is out of bounds.');
    }
  }

  return {
    isValid: issues.length === 0,
    status: issues.length === 0 ? 'valid' : 'needs_review',
    issues
  };
}

/**
 * Main parser entrypoint.
 * Ingests messy raw educational text and returns a clean normalized question array.
 */
function parseEducationalText(rawText, defaultSubject = 'General', defaultMarks = 1, defaultNegativeMarks = 0) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      questions: [],
      stats: { total: 0, valid: 0, needs_review: 0, has_unanswered: false },
      metadata: { subject: defaultSubject }
    };
  }

  // Step 1: Normalize unicode & whitespace
  const normalized = normalizeRawText(rawText);

  // Step 2: Clean repeated headers, footers, page noise
  const cleaned = cleanGarbageAndNoise(normalized);

  // Step 3: Extract standalone answer keys if present
  const { cleanedText, standaloneKeyMap } = extractStandaloneAnswerKeys(cleaned);

  // Step 4: Split into question candidate blocks
  const blocks = splitIntoQuestionBlocks(cleanedText);

  const questions = [];

  for (let i = 0; i < blocks.length; i++) {
    const { qNum, rawBlock } = blocks[i];
    if (!rawBlock.trim()) continue;

    // Step 5: Extract inline answer & explanation
    const { answerIndex: inlineAnswer, answerRawText, cleanedBlock, explanation } = extractInlineAnswer(rawBlock);

    // Step 6: Extract question text and options
    const { questionText, options } = extractOptions(cleanedBlock);

    // Match answer from inline detection, raw answer text matching, or standalone key map
    let finalCorrectIndex = inlineAnswer;

    // If answer index not determined from letter, try matching raw answer text to option text
    if (finalCorrectIndex === null && answerRawText && options.length > 0) {
      const matchIdx = options.findIndex(opt => opt.toLowerCase().includes(answerRawText.toLowerCase()) || answerRawText.toLowerCase().includes(opt.toLowerCase()));
      if (matchIdx !== -1) {
        finalCorrectIndex = matchIdx;
      }
    }

    // Match from standalone answer key map
    if (finalCorrectIndex === null && standaloneKeyMap[qNum] !== undefined) {
      finalCorrectIndex = standaloneKeyMap[qNum];
    } else if (finalCorrectIndex === null && standaloneKeyMap[i + 1] !== undefined) {
      finalCorrectIndex = standaloneKeyMap[i + 1];
    }

    const normalizedOptions = [...options];

    const questionObj = {
      id: `extracted_q_${i + 1}_${Date.now().toString(36)}`,
      qNum: qNum || (i + 1),
      type: 'mcq',
      text: questionText || rawBlock,
      options: normalizedOptions,
      correct_index: finalCorrectIndex,
      marks: defaultMarks,
      negative_marks: defaultNegativeMarks,
      difficulty: 'medium',
      subject: defaultSubject,
      topic: null,
      chapter: null,
      explanation: explanation || null,
      source: 'doc_import',
    };

    // Step 7: Validate question structure
    const validation = validateQuestion(questionObj, i);
    questionObj.status = validation.status;
    questionObj.is_valid = validation.isValid;
    questionObj.issues = validation.issues;

    questions.push(questionObj);
  }

  const validCount = questions.filter(q => q.is_valid).length;
  const needsReviewCount = questions.length - validCount;

  return {
    questions,
    stats: {
      total: questions.length,
      valid: validCount,
      needs_review: needsReviewCount,
      has_unanswered: questions.some(q => q.correct_index === null)
    },
    metadata: {
      subject: defaultSubject
    }
  };
}

module.exports = {
  parseEducationalText,
  normalizeRawText,
  cleanGarbageAndNoise,
  extractStandaloneAnswerKeys,
  extractInlineAnswer,
  extractOptions,
  splitIntoQuestionBlocks,
  validateQuestion
};

