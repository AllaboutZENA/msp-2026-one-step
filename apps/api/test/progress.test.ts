import { describe, expect, it } from 'vitest';
import { calculateProgress } from '../src/domain/progress.js';

describe('calculateProgress (T05)', () => {
  it('is 0% with no subtasks', () => expect(calculateProgress(0, 0).percent).toBe(0));
  it('rounds 1 of 3 to 33%', () => expect(calculateProgress(1, 3).percent).toBe(33));
  it('rounds 2 of 3 to 67%', () => expect(calculateProgress(2, 3).percent).toBe(67));
  it('is 100% when all are done', () => expect(calculateProgress(3, 3).percent).toBe(100));
});
