import { describe, it, expect } from 'vitest';
import { executeUpdateRankings, CHAT_TOOLS } from '../chat-tools';

const SAMPLE_ITEMS = [
  'High base compensation',
  'Work-life balance / flexible hours',
  'Remote work options',
];

describe('CHAT_TOOLS', () => {
  it('exports update_rankings tool definition', () => {
    expect(CHAT_TOOLS).toHaveLength(1);
    expect(CHAT_TOOLS[0].name).toBe('update_rankings');
    expect(CHAT_TOOLS[0].inputSchema).toBeDefined();
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
