const {
  parseEducationalText,
  normalizeRawText,
  cleanGarbageAndNoise,
  extractStandaloneAnswerKeys,
  extractInlineAnswer,
  extractOptions,
  splitIntoQuestionBlocks,
  validateQuestion
} = require('../src/services/questionParser');

describe('Question Parser Engine — Layered Extraction', () => {

  describe('Unicode & Text Normalization', () => {
    test('standardizes smart quotes, dashes, bullets, and linebreaks', () => {
      const messy = '“What is speed?”\r\n— Distance • Time \u2018Velocity\u2019';
      const clean = normalizeRawText(messy);
      expect(clean).toContain('"What is speed?"');
      expect(clean).toContain('- Distance • Time \'Velocity\'');
      expect(clean).not.toContain('\r\n');
    });
  });

  describe('Garbage & Boilerplate Cleaning', () => {
    test('removes page numbers, headers, footers, and exam instructions', () => {
      const docWithNoise = `
APNI VIDYA COACHING INSTITUTE
QUESTION BANK 2026
Page 1 of 12
Time: 3 Hours
All questions are compulsory.
-----------------------------------
1. What is the unit of force?
(A) Newton
(B) Joule
(C) Pascal
(D) Watt
Ans: A
- 1 -
      `;
      const cleaned = cleanGarbageAndNoise(docWithNoise);
      expect(cleaned).not.toContain('Page 1 of 12');
      expect(cleaned).not.toContain('- 1 -');
      expect(cleaned).not.toContain('All questions are compulsory.');
      expect(cleaned).toContain('1. What is the unit of force?');
    });
  });

  describe('Option & Inline Answer Extraction', () => {
    test('extracts stacked vertical options (A, B, C, D) and inline answer', () => {
      const block = `
What is the chemical formula of water?
(A) CO2
(B) H2O
(C) NaCl
(D) CH4
Ans: B
      `;
      const { answerIndex, cleanedBlock } = extractInlineAnswer(block);
      expect(answerIndex).toBe(1); // B = index 1

      const { questionText, options } = extractOptions(cleanedBlock);
      expect(questionText.trim()).toBe('What is the chemical formula of water?');
      expect(options).toHaveLength(4);
      expect(options[0]).toBe('CO2');
      expect(options[1]).toBe('H2O');
      expect(options[2]).toBe('NaCl');
      expect(options[3]).toBe('CH4');
    });

    test('extracts horizontal inline options', () => {
      const block = `Which city is the capital of France?
(A) London   (B) Paris   (C) Berlin   (D) Madrid
Answer: B`;
      const { answerIndex, cleanedBlock } = extractInlineAnswer(block);
      expect(answerIndex).toBe(1);

      const { questionText, options } = extractOptions(cleanedBlock);
      expect(questionText.trim()).toBe('Which city is the capital of France?');
      expect(options).toHaveLength(4);
      expect(options[0]).toBe('London');
      expect(options[1]).toBe('Paris');
      expect(options[2]).toBe('Berlin');
      expect(options[3]).toBe('Madrid');
    });

    test('extracts lowercase options e.g. a), b), c), d)', () => {
      const block = `The speed of light is approximately:
a) 3 x 10^8 m/s
b) 3 x 10^6 m/s
c) 3 x 10^5 m/s
d) 3 x 10^4 m/s
Correct: A`;
      const { answerIndex, cleanedBlock } = extractInlineAnswer(block);
      expect(answerIndex).toBe(0); // A = index 0

      const { options } = extractOptions(cleanedBlock);
      expect(options).toHaveLength(4);
      expect(options[0]).toBe('3 x 10^8 m/s');
    });
  });

  describe('Standalone Answer Key Detection', () => {
    test('extracts trailing answer key table and maps to question numbers', () => {
      const fullDoc = `
1. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6

2. What is 5 x 5?
A. 10
B. 20
C. 25
D. 30

ANSWER KEY:
1. B
2. C
      `;
      const { cleanedText, standaloneKeyMap } = extractStandaloneAnswerKeys(fullDoc);
      expect(standaloneKeyMap[1]).toBe(1); // 1 -> B (index 1)
      expect(standaloneKeyMap[2]).toBe(2); // 2 -> C (index 2)
      expect(cleanedText).not.toContain('ANSWER KEY:');
    });
  });

  describe('Full Document Ingestion Pipeline', () => {
    test('parses multiple questions with messy formatting into normalized valid objects', () => {
      const messyDoc = `
========================================
APNI VIDYA SAMPLE TEST PAPER
========================================
Page 1 of 5

Q1. Which gas do plants absorb during photosynthesis?
A) Oxygen
B) Nitrogen
C) Carbon Dioxide
D) Hydrogen
Ans: C

Q.2 Acceleration due to gravity on Earth is approximately:
1) 9.8 m/s^2
2) 8.9 m/s^2
3) 10.8 m/s^2
4) 7.8 m/s^2
Answer: 1

3) Which of the following is an immutable data type in Python?
[A] List
[B] Dictionary
[C] Tuple
[D] Set
[Ans: C]
      `;

      const result = parseEducationalText(messyDoc, 'Science');
      expect(result.questions).toHaveLength(3);
      expect(result.stats.valid).toBe(3);
      expect(result.stats.needs_review).toBe(0);

      // Question 1
      expect(result.questions[0].text).toContain('Which gas do plants absorb');
      expect(result.questions[0].options).toEqual(['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen']);
      expect(result.questions[0].correct_index).toBe(2); // C
      expect(result.questions[0].is_valid).toBe(true);

      // Question 2
      expect(result.questions[1].text).toContain('Acceleration due to gravity');
      expect(result.questions[1].options).toEqual(['9.8 m/s^2', '8.9 m/s^2', '10.8 m/s^2', '7.8 m/s^2']);
      expect(result.questions[1].correct_index).toBe(0); // 1 -> A -> 0

      // Question 3
      expect(result.questions[2].text).toContain('immutable data type');
      expect(result.questions[2].options).toEqual(['List', 'Dictionary', 'Tuple', 'Set']);
      expect(result.questions[2].correct_index).toBe(2); // C
    });

    test('handles 2x2 grid options and explanations accurately', () => {
      const gridDoc = `
1. Which planet is known as the Red Planet?
(A) Earth    (B) Mars
(C) Jupiter  (D) Venus
Ans: B
Explanation: Mars is called the Red Planet because of iron oxide on its surface.

Q2. What is 2 + 2?
(i) 3   (ii) 4   (iii) 5   (iv) 6
Answer: (ii)
      `;
      const result = parseEducationalText(gridDoc);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].options).toEqual(['Earth', 'Mars', 'Jupiter', 'Venus']);
      expect(result.questions[0].correct_index).toBe(1);
      expect(result.questions[0].explanation).toContain('iron oxide');

      expect(result.questions[1].options).toEqual(['3', '4', '5', '6']);
      expect(result.questions[1].correct_index).toBe(1);
    });

    test('flags incomplete/unanswered questions as needs_review without crashing', () => {
      const brokenDoc = `
1. This question has no options and no answer.

2. Valid question
A. Opt 1
B. Opt 2
C. Opt 3
D. Opt 4
      `;
      const result = parseEducationalText(brokenDoc);
      expect(result.questions.length).toBeGreaterThanOrEqual(1);
      
      const unAns = result.questions.find(q => q.correct_index === null);
      expect(unAns).toBeDefined();
      expect(unAns.is_valid).toBe(false);
      expect(unAns.status).toBe('needs_review');
      expect(unAns.issues.length).toBeGreaterThan(0);
    });

    test('parses AI-generated markdown text with bolding, headers, and answer keys', () => {
      const aiDoc = `# COMPUTER SCIENCE - PRACTICE QUESTIONS

**Q1. Which data structure follows the FIFO principle?**

A. Stack
B) Queue
C. Tree
D : Graph

---

### **Question 2**

What is the **time complexity** of binary search on a sorted array?

(A) O(n)
**B. O(log n)**
C) O(n log n)
D) O(1)

**3. Which HTML tag is used to create a hyperlink?**

A. <link>
B. <a>
C. <href>
D. <url>

## **Q4) SQL**

Which command is used to **retrieve data** from a database?

A) INSERT
B. UPDATE
**C) SELECT**
D. DELETE

**Question 5:**

Which protocol is commonly used to securely transfer web pages over the internet?

A. HTTP
B. FTP
C. SMTP
D. **HTTPS**

**ANSWER KEY**
Q1 - B
Q2: B
3. B
Q4 = C
5 - D
`;
      const result = parseEducationalText(aiDoc, 'Computer Science', 1, 0);
      expect(result.questions).toHaveLength(5);
      expect(result.stats.valid).toBe(5);
      expect(result.questions[0].options).toEqual(['Stack', 'Queue', 'Tree', 'Graph']);
      expect(result.questions[0].correct_index).toBe(1);
      expect(result.questions[1].correct_index).toBe(1);
      expect(result.questions[2].options).toEqual(['<link>', '<a>', '<href>', '<url>']);
      expect(result.questions[2].correct_index).toBe(1);
      expect(result.questions[3].correct_index).toBe(2);
      expect(result.questions[4].correct_index).toBe(3);
    });
  });

  describe('Question Validation Rules', () => {
    test('detects duplicate options and missing correct answers', () => {
      const q = {
        type: 'mcq',
        text: 'Duplicate option test',
        options: ['Option A', 'Option A', 'Option C', 'Option D'],
        correct_index: null
      };
      const val = validateQuestion(q, 0);
      expect(val.isValid).toBe(false);
      expect(val.issues).toEqual(expect.arrayContaining([
        'Duplicate option values detected.',
        'Correct answer has not been selected.'
      ]));
    });
  });

});

