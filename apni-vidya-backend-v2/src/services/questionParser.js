/**
 * APNI VIDYA 2.0 — DETERMINISTIC QUESTION EXTRACTION & NORMALIZATION ENGINE
 * 
 * Layered parsing pipeline:
 * 1. Unicode & whitespace normalization
 * 2. Header/footer/garbage cleaning & noise reduction
 * 3. Answer key detection (inline & separate answer blocks)
 * 4. Question boundary & numbering detection
 * 5. Option boundary detection (vertical stacked & inline horizontal)
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
    // Normalize fractions/math symbols where appropriate
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

  // Collapse multiple consecutive blank lines into a single blank line
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n');
}

/**
 * Detects and extracts standalone answer key blocks (e.g. "Answer Key", "Answers: 1-A, 2-B, 3-C...").
 * Returns { cleanedText, standaloneKeyMap }
 */
function extractStandaloneAnswerKeys(text) {
  const keyMap = {}; // questionNumber -> correct_index (0..3)

  // Pattern matching standalone Answer Key section
  const answerKeySectionRegex = /(?:^|\n)\s*(?:ANSWER\s*KEY|ANSWERS?|SOLUTIONS?|KEY\s*SHEET)\s*[:\-]?\s*\n+([\s\S]+)$/i;
  const match = text.match(answerKeySectionRegex);

  let cleanedText = text;

  if (match) {
    const keySectionText = match[1];
    cleanedText = text.substring(0, match.index).trim();

    // Parse various key list patterns:
    // e.g. "1. A", "1) (b)", "1-C", "Q1: D", "1.A 2.B 3.C", "1.(A)  2.(B)"
    const itemRegex = /(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\:\)\-\s]+\(?([A-Da-d1-4])\)?/g;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(keySectionText)) !== null) {
      const qNum = parseInt(itemMatch[1], 10);
      const optChar = itemMatch[2].toUpperCase();
      let index = null;
      if (optChar >= 'A' && optChar <= 'D') {
        index = optChar.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      } else if (optChar >= '1' && optChar <= '4') {
        index = parseInt(optChar, 10) - 1;
      }
      if (index !== null) {
        keyMap[qNum] = index;
      }
    }
  }

  return { cleanedText, standaloneKeyMap: keyMap };
}

/**
 * Extracts inline answer from a question text block (e.g. "Ans: B", "Answer: (A)", "Correct Option: C").
 * Returns { answerIndex, cleanedBlock, explanation }
 */
function extractInlineAnswer(block) {
  let answerIndex = null;
  let explanation = '';
  let cleaned = block;

  // Inline Answer Patterns
  const ansPatterns = [
    /(?:^|\n)\s*(?:Ans(?:wer)?|Correct(?:\s*Option|\s*Answer)?|Key|Option)\s*[:\-]?\s*\(?([A-Da-d1-4])\)?(?:\s*[\.\:\-\–]\s*([^\n]*))?/i,
    /(?:^|\n)\s*\[\s*(?:Ans(?:wer)?|Correct|Key)\s*[:\-]?\s*([A-Da-d1-4])\s*\]/i,
    /(?:^|\n)\s*\(\s*(?:Ans(?:wer)?|Correct|Key)\s*[:\-]?\s*([A-Da-d1-4])\s*\)/i,
  ];

  for (const pattern of ansPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const char = match[1].toUpperCase();
      if (char >= 'A' && char <= 'D') {
        answerIndex = char.charCodeAt(0) - 65;
      } else if (char >= '1' && char <= '4') {
        answerIndex = parseInt(char, 10) - 1;
      }
      if (match[2]) {
        explanation = match[2].trim();
      }
      // Remove the answer line from the question/option text
      cleaned = cleaned.replace(match[0], '').trim();
      break;
    }
  }

  return { answerIndex, cleanedBlock: cleaned, explanation };
}

/**
 * Parses options from a question block.
 * Handles both vertical stacked options and horizontal inline options.
 */
function extractOptions(block) {
  const options = [];
  let questionText = block;

  // Check for horizontal inline options e.g. "(A) Apple  (B) Mango  (C) Banana  (D) Orange"
  // or "A. Apple   B. Mango   C. Banana   D. Orange"
  const inlineMatch = block.match(/(?:^|\n)(.*?)(?:\n|\s{2,})(?:\(?A[\.\)\:]\s*|\(A\)\s*)(.+?)(?:\s{2,}|\n)(?:\(?B[\.\)\:]\s*|\(B\)\s*)(.+?)(?:\s{2,}|\n)(?:\(?C[\.\)\:]\s*|\(C\)\s*)(.+?)(?:\s{2,}|\n)(?:\(?D[\.\)\:]\s*|\(D\)\s*)(.+?)$/is);
  
  if (inlineMatch) {
    questionText = inlineMatch[1].trim();
    return {
      questionText,
      options: [
        inlineMatch[2].trim(),
        inlineMatch[3].trim(),
        inlineMatch[4].trim(),
        inlineMatch[5].trim(),
      ]
    };
  }

  // Vertical stacked options with flexible prefixes:
  // (A), (B), (C), (D) | A., B., C., D. | A), B), C), D) | a), b), c), d) | 1), 2), 3), 4) | (i), (ii), (iii), (iv)
  const optionRegex = /(?:^|\n)\s*(?:\(([A-Da-d1-4])\)\s*|\[([A-Da-d1-4])\]\s*|\(([ivx]+)\)\s*|([A-Da-d1-4])[\.\)\:\-]\s*)([^\n]+(?:\n(?!\s*(?:\(?[A-Da-d1-4][\.\)\:\-]|\([A-Da-d1-4]\)|\[[A-Da-d1-4]\]|\([ivx]+\)|Ans|Answer|Correct)).*)*)/gi;

  const matches = [];
  let match;
  while ((match = optionRegex.exec(block)) !== null) {
    const rawLabel = (match[1] || match[2] || match[3] || match[4] || '').toUpperCase();
    matches.push({
      index: match.index,
      fullLength: match[0].length,
      label: rawLabel,
      text: match[5] ? match[5].trim() : ''
    });
  }

  if (matches.length >= 2) {
    // Check if matches form a valid option sequence (e.g. A, B or 1, 2 or a, b)
    const firstOptionIndex = matches[0].index;
    questionText = block.substring(0, firstOptionIndex).trim();

    for (const m of matches) {
      let optText = m.text.trim();
      options.push(optText);
    }
  }

  return { questionText, options };
}

/**
 * Splits raw document text into question candidate chunks based on numbered boundaries.
 */
function splitIntoQuestionBlocks(text) {
  const blocks = [];
  
  // Distinguish question starts from options:
  // Question starts:
  // 1. Explicit Q prefix: "Q1.", "Q.1", "Question 1:", "Que 1.", "Q 1:"
  // 2. Number with dot / colon / bracket at line start: "1.", "2:", "[1]", "[2]"
  // 3. Number with parenthesis "1)", "(1)" ONLY if not inside an option list
  
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

    blocks.push({
      qNum: current.qNum,
      rawBlock: strippedBlock
    });
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
      stats: { total: 0, valid: 0, needs_review: 0 },
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
    const { answerIndex: inlineAnswer, cleanedBlock, explanation } = extractInlineAnswer(rawBlock);

    // Step 6: Extract question text and options
    const { questionText, options } = extractOptions(cleanedBlock);

    // Match answer from standalone key map or inline detection
    let finalCorrectIndex = inlineAnswer;
    if (finalCorrectIndex === null && standaloneKeyMap[qNum] !== undefined) {
      finalCorrectIndex = standaloneKeyMap[qNum];
    } else if (finalCorrectIndex === null && standaloneKeyMap[i + 1] !== undefined) {
      finalCorrectIndex = standaloneKeyMap[i + 1];
    }

    // Ensure options array structure
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
