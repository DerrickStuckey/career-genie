import { describe, it, expect } from 'vitest';
import { executeUpdateRankings, executeUpdateResume, executeToolCall, CHAT_TOOLS } from '../chat-tools';

const SAMPLE_ITEMS = [
  'High base compensation',
  'Work-life balance / flexible hours',
  'Remote work options',
];

describe('CHAT_TOOLS', () => {
  it('exports both tool definitions', () => {
    expect(CHAT_TOOLS).toHaveLength(2);
    expect(CHAT_TOOLS.map((t) => t.name)).toContain('update_rankings');
    expect(CHAT_TOOLS.map((t) => t.name)).toContain('update_resume');
  });
});

describe('executeUpdateRankings', () => {
  it('reorders rankings successfully', () => {
    const result = executeUpdateRankings(
      { rankings: ['Remote work options', 'High base compensation', 'Work-life balance / flexible hours'] },
      SAMPLE_ITEMS,
    );
    expect(result.success).toBe(true);
    expect(result.newRankings).toEqual([
      'Remote work options',
      'High base compensation',
      'Work-life balance / flexible hours',
    ]);
    expect(result.resultText).toContain('Rankings updated successfully');
  });

  it('rejects non-array input', () => {
    const result = executeUpdateRankings({ rankings: 'not an array' }, SAMPLE_ITEMS);
    expect(result.success).toBe(false);
    expect(result.resultText).toContain('must be an array');
  });

  it('rejects wrong number of items', () => {
    const result = executeUpdateRankings({ rankings: ['Only one'] }, SAMPLE_ITEMS);
    expect(result.success).toBe(false);
    expect(result.resultText).toContain('expected 3 items');
  });

  it('rejects unknown items', () => {
    const result = executeUpdateRankings(
      { rankings: ['Unknown item', 'High base compensation', 'Remote work options'] },
      SAMPLE_ITEMS,
    );
    expect(result.success).toBe(false);
    expect(result.resultText).toContain('not a valid career quality');
  });

  it('rejects duplicate items', () => {
    const result = executeUpdateRankings(
      { rankings: ['Remote work options', 'Remote work options', 'High base compensation'] },
      SAMPLE_ITEMS,
    );
    expect(result.success).toBe(false);
    expect(result.resultText).toContain('duplicate');
  });

  it('matches items case-insensitively and preserves original casing', () => {
    const result = executeUpdateRankings(
      { rankings: ['remote work options', 'high base compensation', 'work-life balance / flexible hours'] },
      SAMPLE_ITEMS,
    );
    expect(result.success).toBe(true);
    expect(result.newRankings).toEqual([
      'Remote work options',
      'High base compensation',
      'Work-life balance / flexible hours',
    ]);
  });
});

describe('executeUpdateResume', () => {
  it('accepts a valid resume string', () => {
    const result = executeUpdateResume({ resume: '# John Doe\n\n## Experience\n...' });
    expect(result.success).toBe(true);
    expect(result.newResume).toBe('# John Doe\n\n## Experience\n...');
    expect(result.resultText).toContain('updated successfully');
  });

  it('rejects non-string input', () => {
    const result = executeUpdateResume({ resume: 123 });
    expect(result.success).toBe(false);
    expect(result.resultText).toContain('must be a string');
  });

  it('rejects empty string', () => {
    const result = executeUpdateResume({ resume: '   ' });
    expect(result.success).toBe(false);
    expect(result.resultText).toContain('must not be empty');
  });
});

describe('executeToolCall', () => {
  it('routes update_rankings calls', () => {
    const result = executeToolCall(
      { id: 'tc_1', name: 'update_rankings', input: { rankings: ['Remote work options', 'High base compensation', 'Work-life balance / flexible hours'] } },
      SAMPLE_ITEMS,
    );
    expect(result.newRankings).toBeDefined();
    expect(result.resultText).toContain('Rankings updated');
  });

  it('routes update_resume calls', () => {
    const result = executeToolCall(
      { id: 'tc_2', name: 'update_resume', input: { resume: '# Resume' } },
      [],
    );
    expect(result.newResume).toBe('# Resume');
    expect(result.resultText).toContain('updated successfully');
  });

  it('returns no newResume on validation failure', () => {
    const result = executeToolCall(
      { id: 'tc_3', name: 'update_resume', input: { resume: '' } },
      [],
    );
    expect(result.newResume).toBeUndefined();
    expect(result.resultText).toContain('Error');
  });

  it('returns error for unknown tool', () => {
    const result = executeToolCall(
      { id: 'tc_4', name: 'unknown_tool', input: {} },
      [],
    );
    expect(result.resultText).toContain('unknown tool');
  });
});
