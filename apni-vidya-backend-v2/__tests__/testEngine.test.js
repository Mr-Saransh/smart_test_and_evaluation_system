describe('Assessment Engine Scoring & Analytics Logic', () => {

  describe('Objective Auto-Grading Math', () => {
    test('computes marks with positive and negative marking', () => {
      const questions = [
        { id: 'q1', correct_index: 0, marks: 4, negative_marks: 1 },
        { id: 'q2', correct_index: 1, marks: 4, negative_marks: 1 },
        { id: 'q3', correct_index: 2, marks: 4, negative_marks: 1 },
        { id: 'q4', correct_index: 3, marks: 4, negative_marks: 1 },
      ];

      const answers = {
        q1: 0, // Correct (+4)
        q2: 2, // Wrong (-1)
        q3: 2, // Correct (+4)
        // q4: skipped (0)
      };

      let score = 0;
      let correct = 0, wrong = 0, skipped = 0;

      questions.forEach(q => {
        const ans = answers[q.id];
        if (ans === undefined || ans === null) {
          skipped++;
        } else if (ans === q.correct_index) {
          score += q.marks;
          correct++;
        } else {
          score -= q.negative_marks;
          wrong++;
        }
      });

      score = Math.max(0, score);
      const accuracy = (correct + wrong) > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;

      expect(score).toBe(7); // +4 - 1 + 4 + 0 = 7
      expect(correct).toBe(2);
      expect(wrong).toBe(1);
      expect(skipped).toBe(1);
      expect(accuracy).toBe(67); // 2/3 = 66.67 -> 67%
    });

    test('clamps score to 0 if negative marking exceeds positive', () => {
      const questions = [
        { id: 'q1', correct_index: 0, marks: 1, negative_marks: 2 },
        { id: 'q2', correct_index: 1, marks: 1, negative_marks: 2 },
      ];
      const answers = { q1: 1, q2: 2 }; // both wrong (-4)
      let score = 0;
      questions.forEach(q => {
        if (answers[q.id] !== q.correct_index) score -= q.negative_marks;
      });
      score = Math.max(0, score);
      expect(score).toBe(0);
    });
  });

  describe('Item Quality & Empirical Difficulty Calculation', () => {
    test('computes question difficulty ratings from student error rates', () => {
      const submissions = [
        { answers: { q1: 0, q2: 1 } },
        { answers: { q1: 0, q2: 2 } },
        { answers: { q1: 0, q2: 2 } },
        { answers: { q1: 1, q2: 2 } },
      ];

      const q1 = { id: 'q1', correct_index: 0 }; // 3 correct out of 4 (75% -> Easy)
      const q2 = { id: 'q2', correct_index: 1 }; // 1 correct out of 4 (25% -> Hard, 75% wrong -> Problematic)

      // Evaluate Q1
      let q1Correct = 0, q1Wrong = 0;
      submissions.forEach(s => {
        if (s.answers.q1 === q1.correct_index) q1Correct++;
        else q1Wrong++;
      });
      const q1CorrectPct = Math.round((q1Correct / submissions.length) * 100);
      let q1Difficulty = 'Medium';
      if (q1CorrectPct >= 75) q1Difficulty = 'Easy';
      else if (q1CorrectPct < 40) q1Difficulty = 'Hard';

      expect(q1CorrectPct).toBe(75);
      expect(q1Difficulty).toBe('Easy');

      // Evaluate Q2
      let q2Correct = 0, q2Wrong = 0;
      submissions.forEach(s => {
        if (s.answers.q2 === q2.correct_index) q2Correct++;
        else q2Wrong++;
      });
      const q2CorrectPct = Math.round((q2Correct / submissions.length) * 100);
      const q2WrongPct = Math.round((q2Wrong / submissions.length) * 100);
      let q2Difficulty = 'Medium';
      if (q2CorrectPct >= 75) q2Difficulty = 'Easy';
      else if (q2CorrectPct < 40) q2Difficulty = 'Hard';

      expect(q2CorrectPct).toBe(25);
      expect(q2Difficulty).toBe('Hard');
      expect(q2WrongPct > 70).toBe(true); // Flagged as problematic
    });
  });

  describe('Anti-Cheat Event Logging', () => {
    test('accumulates security events with timestamps', () => {
      const securityEvents = [];
      
      const recordEvent = (type, detail) => {
        securityEvents.push({
          type,
          detail,
          timestamp: new Date().toISOString()
        });
      };

      recordEvent('fullscreen_exit', 'Student exited fullscreen mode');
      recordEvent('tab_switch', 'Document hidden / tab switched');

      expect(securityEvents).toHaveLength(2);
      expect(securityEvents[0].type).toBe('fullscreen_exit');
      expect(securityEvents[1].type).toBe('tab_switch');
      expect(securityEvents[0].timestamp).toBeDefined();
    });
  });

});
