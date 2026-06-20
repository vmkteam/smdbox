import { describe, it, expect } from 'vitest';

import { formatBytes, formatDuration, jsonByteSize } from '../format';
import { recentMethodNames } from '../recent';
import type { HistoryItem } from '../../store/store';

describe('format helpers', () => {
  it('computes JSON byte size', () => {
    expect(jsonByteSize({ a: 1 })).toBe(JSON.stringify({ a: 1 }).length);
    expect(jsonByteSize('€')).toBe(5); // "\"€\"" -> 2 quotes + 3-byte euro
  });

  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });

  it('formats duration', () => {
    expect(formatDuration(812)).toBe('812 ms');
    expect(formatDuration(1200)).toBe('1.20 s');
  });
});

describe('recentMethodNames', () => {
  const h = (method: string): HistoryItem => ({
    id: method,
    method,
    params: {},
    status: 'ok',
    ts: 0,
  });

  it('returns distinct methods, newest first, limited and filtered', () => {
    const history = [h('A'), h('B'), h('A'), h('C')];
    const available = new Set(['A', 'B', 'C']);
    expect(recentMethodNames(history, available, 2)).toEqual(['C', 'A']);
  });

  it('drops methods missing from the schema', () => {
    const history = [h('A'), h('Gone')];
    expect(recentMethodNames(history, new Set(['A']), 5)).toEqual(['A']);
  });
});
