import { describe, it, expect } from 'vitest';
import { parseExportMarkdown } from '../import';
import { buildExportMarkdown } from '../export';
const PREDEFINED_QUESTIONS = [
  "What would you do if you didn't have to work for a living?",
  "What would you do career-wise if you knew you wouldn't fail?",
  "What's play for you but work for others?",
  "What was the most fun you ever had while working? Follow-up: Why?",
  "What could you stay excited about for a decade?",
];

// A minimal valid exported markdown
const VALID_MARKDOWN = `---
generated: 2026-04-28
app: career-genie
version: 1
---

# Career Genie Results

## Reflection Questions

### What would you do if you didn't have to work for a living?

**Answer:** Travel the world

**Why:** I love exploring

### What would you do career-wise if you knew you wouldn't fail?

**Answer:** Start a company

## Priority Rankings (most to least important)

1. High base compensation
2. Work-life balance / flexible hours
3. Remote work options
`;

describe('parseExportMarkdown — frontmatter validation', () => {
  it('rejects file without frontmatter', () => {
    const result = parseExportMarkdown('# Career Genie Results\n\nNo frontmatter here.', PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/Career Genie/i);
    }
  });

  it('rejects wrong app identifier', () => {
    const content = `---
generated: 2026-04-28
app: some-other-app
version: 1
---

# Career Genie Results
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/Career Genie/i);
    }
  });

  it('rejects unsupported version', () => {
    const content = `---
generated: 2026-04-28
app: career-genie
version: 99
---

# Career Genie Results
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toMatch(/version/i);
    }
  });
});

describe('parseExportMarkdown — question parsing', () => {
  it('parses questions with answers and why values', () => {
    const result = parseExportMarkdown(VALID_MARKDOWN, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    const q0 = result.questionResponses.find((r) => r.questionId === 0);
    expect(q0?.answer).toBe('Travel the world');
    expect(q0?.whyAnswer).toBe('I love exploring');
    expect(q0?.isComplete).toBe(true);

    const q1 = result.questionResponses.find((r) => r.questionId === 1);
    expect(q1?.answer).toBe('Start a company');
    expect(q1?.whyAnswer).toBe('');
    expect(q1?.isComplete).toBe(true);
  });

  it('handles missing why answer (whyAnswer should be empty string)', () => {
    const content = `---
generated: 2026-04-28
app: career-genie
version: 1
---

# Career Genie Results

## Reflection Questions

### What would you do if you didn't have to work for a living?

**Answer:** Travel the world

## Priority Rankings (most to least important)

1. Salary
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    const q0 = result.questionResponses.find((r) => r.questionId === 0);
    expect(q0?.answer).toBe('Travel the world');
    expect(q0?.whyAnswer).toBe('');
    expect(q0?.isComplete).toBe(true);
  });

  it('leaves unmatched questions at defaults with a warning', () => {
    const content = `---
generated: 2026-04-28
app: career-genie
version: 1
---

# Career Genie Results

## Reflection Questions

### This question does not exist in predefined list

**Answer:** Some answer

## Priority Rankings (most to least important)

1. Salary
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    // All responses should be at defaults (no answers)
    result.questionResponses.forEach((r) => {
      expect(r.answer).toBe('');
      expect(r.isComplete).toBe(false);
    });

    // Should have a warning about the unrecognized question
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => /unrecognized|unmatched|skipped/i.test(w))).toBe(true);
  });

  it('handles partial question matches (3 of 5 matched)', () => {
    const content = `---
generated: 2026-04-28
app: career-genie
version: 1
---

# Career Genie Results

## Reflection Questions

### What would you do if you didn't have to work for a living?

**Answer:** Travel

### What's play for you but work for others?

**Answer:** Writing

### What could you stay excited about for a decade?

**Answer:** Building software

## Priority Rankings (most to least important)

1. Salary
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.questionResponses).toHaveLength(PREDEFINED_QUESTIONS.length);

    const answered = result.questionResponses.filter((r) => r.isComplete);
    expect(answered).toHaveLength(3);

    expect(result.questionResponses[0].answer).toBe('Travel');
    expect(result.questionResponses[1].answer).toBe(''); // not in file
    expect(result.questionResponses[2].answer).toBe('Writing');
    expect(result.questionResponses[3].answer).toBe(''); // not in file
    expect(result.questionResponses[4].answer).toBe('Building software');
  });

  it('adds warning when no questions section found', () => {
    const content = `---
generated: 2026-04-28
app: career-genie
version: 1
---

# Career Genie Results

## Priority Rankings (most to least important)

1. Salary
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.warnings.some((w) => /question/i.test(w))).toBe(true);
  });
});

describe('parseExportMarkdown — ranking parsing', () => {
  it('parses numbered ranking list correctly', () => {
    const result = parseExportMarkdown(VALID_MARKDOWN, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.rankedQualities).toEqual([
      'High base compensation',
      'Work-life balance / flexible hours',
      'Remote work options',
    ]);
  });

  it('returns null rankings with warning when section missing', () => {
    const content = `---
generated: 2026-04-28
app: career-genie
version: 1
---

# Career Genie Results

## Reflection Questions

### What would you do if you didn't have to work for a living?

**Answer:** Travel the world
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.rankedQualities).toBeNull();
    expect(result.warnings.some((w) => /ranking/i.test(w))).toBe(true);
  });
});

describe('parseExportMarkdown — round-trip', () => {
  it('parses back data exported by buildExportMarkdown', () => {
    const originalResponses: QuestionResponse[] = [
      {
        questionId: 0,
        question: "What would you do if you didn't have to work for a living?",
        answer: 'Travel the world',
        whyAnswer: 'I love exploring new cultures',
        isComplete: true,
      },
      {
        questionId: 1,
        question: "What would you do career-wise if you knew you wouldn't fail?",
        answer: 'Start a software company',
        whyAnswer: '',
        isComplete: true,
      },
      {
        questionId: 2,
        question: "What's play for you but work for others?",
        answer: '',
        whyAnswer: '',
        isComplete: false,
      },
      {
        questionId: 3,
        question: 'What was the most fun you ever had while working? Follow-up: Why?',
        answer: '',
        whyAnswer: '',
        isComplete: false,
      },
      {
        questionId: 4,
        question: 'What could you stay excited about for a decade?',
        answer: 'Building great products',
        whyAnswer: 'It creates lasting impact',
        isComplete: true,
      },
    ];
    const originalRankings = ['High base compensation', 'Work-life balance / flexible hours', 'Remote work options'];

    const markdown = buildExportMarkdown(originalResponses, originalRankings);
    const result = parseExportMarkdown(markdown, PREDEFINED_QUESTIONS);

    expect('error' in result).toBe(false);
    if ('error' in result) return;

    // Answered questions should match
    expect(result.questionResponses[0].answer).toBe('Travel the world');
    expect(result.questionResponses[0].whyAnswer).toBe('I love exploring new cultures');
    expect(result.questionResponses[0].isComplete).toBe(true);

    expect(result.questionResponses[1].answer).toBe('Start a software company');
    expect(result.questionResponses[1].whyAnswer).toBe('');
    expect(result.questionResponses[1].isComplete).toBe(true);

    // Unanswered questions should remain at defaults
    expect(result.questionResponses[2].answer).toBe('');
    expect(result.questionResponses[2].isComplete).toBe(false);
    expect(result.questionResponses[3].answer).toBe('');
    expect(result.questionResponses[3].isComplete).toBe(false);

    expect(result.questionResponses[4].answer).toBe('Building great products');
    expect(result.questionResponses[4].whyAnswer).toBe('It creates lasting impact');
    expect(result.questionResponses[4].isComplete).toBe(true);

    // Rankings should match
    expect(result.rankedQualities).toEqual(originalRankings);

    // Question text should be preserved
    result.questionResponses.forEach((r, i) => {
      expect(r.question).toBe(PREDEFINED_QUESTIONS[i]);
      expect(r.questionId).toBe(i);
    });

    // No warnings for a clean round-trip
    expect(result.warnings).toHaveLength(0);
  });
});

describe('parseExportMarkdown — edge cases', () => {
  it('returns error for empty string', () => {
    const result = parseExportMarkdown('', PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(true);
  });

  it('handles multiline answers', () => {
    const content = `---
generated: 2026-04-28
app: career-genie
version: 1
---

# Career Genie Results

## Reflection Questions

### What would you do if you didn't have to work for a living?

**Answer:** Travel the world
Visit many countries
See amazing places

**Why:** I love exploring

### What would you do career-wise if you knew you wouldn't fail?

**Answer:** Start a company

## Priority Rankings (most to least important)

1. Salary
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    const q0 = result.questionResponses.find((r) => r.questionId === 0);
    expect(q0?.answer).toContain('Travel the world');
    expect(q0?.answer).toContain('Visit many countries');
    expect(q0?.answer).toContain('See amazing places');
    expect(q0?.whyAnswer).toBe('I love exploring');
  });

  it('handles file with only frontmatter and title (no sections)', () => {
    const content = `---
generated: 2026-04-28
app: career-genie
version: 1
---

# Career Genie Results
`;
    const result = parseExportMarkdown(content, PREDEFINED_QUESTIONS);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    // All defaults, two warnings (no questions, no rankings)
    result.questionResponses.forEach((r) => {
      expect(r.answer).toBe('');
      expect(r.isComplete).toBe(false);
    });
    expect(result.rankedQualities).toBeNull();
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
});
