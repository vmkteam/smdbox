import { describe, it, expect } from 'vitest';

import { filterJson } from '../jsonFilter';

const data = {
  id: 1,
  title: 'Russian Doll',
  author: { name: 'Natasha', city: 'Moscow' },
  tags: ['drama', 'comedy'],
};

describe('filterJson', () => {
  it('returns the input unchanged for an empty query', () => {
    expect(filterJson(data, '')).toBe(data);
    expect(filterJson(data, '   ')).toBe(data);
  });

  it('keeps the whole subtree when a key matches', () => {
    expect(filterJson(data, 'author')).toEqual({
      author: { name: 'Natasha', city: 'Moscow' },
    });
  });

  it('keeps branches where a primitive value matches', () => {
    expect(filterJson(data, 'moscow')).toEqual({ author: { city: 'Moscow' } });
  });

  it('matches inside arrays', () => {
    expect(filterJson(data, 'comedy')).toEqual({ tags: ['comedy'] });
  });

  it('is case-insensitive and matches numbers', () => {
    expect(filterJson(data, 'russian')).toEqual({ title: 'Russian Doll' });
    expect(filterJson(data, '1')).toEqual({ id: 1 });
  });

  it('returns undefined when nothing matches', () => {
    expect(filterJson(data, 'zzz')).toBeUndefined();
  });
});
