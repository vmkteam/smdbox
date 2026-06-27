import { describe, it, expect } from 'vitest';

import { idLinkUrl } from '../idLinks';

const rules = {
  showId: 'https://myshows.me/view/{id}/',
  movieId: 'https://myshows.me/movie/{id}/',
  newsId: 'https://myshows.me/news/{id}/',
  productId: 'https://example.com/product/{id}',
};

describe('idLinkUrl', () => {
  it('matches the leaf key directly', () => {
    expect(idLinkUrl(['showId'], 35595, rules)).toBe('https://myshows.me/view/35595/');
    expect(idLinkUrl(['productId'], 262423, rules)).toBe('https://example.com/product/262423');
  });

  it('accepts string values', () => {
    expect(idLinkUrl(['movieId'], '1', rules)).toBe('https://myshows.me/movie/1/');
  });

  it('matches field names case-insensitively', () => {
    expect(idLinkUrl(['MovieID'], 1, rules)).toBe('https://myshows.me/movie/1/');
    expect(idLinkUrl(['ID', 'Movie'], 1, rules)).toBe('https://myshows.me/movie/1/');
  });

  it('treats a bare id under an entity object as that entity id', () => {
    expect(idLinkUrl(['id', 'movie'], 1, rules)).toBe('https://myshows.me/movie/1/');
    expect(idLinkUrl(['id', 'news'], 12514, rules)).toBe('https://myshows.me/news/12514/');
  });

  it('singularizes a plural parent key (movies[].id -> movieId)', () => {
    expect(idLinkUrl(['id', 0, 'movies'], 1, rules)).toBe('https://myshows.me/movie/1/');
    expect(idLinkUrl(['id', 3, 'shows'], 42, rules)).toBe('https://myshows.me/view/42/');
  });

  it('returns null for unknown fields and bare id without a matching parent', () => {
    expect(idLinkUrl(['title'], 5, rules)).toBeNull();
    expect(idLinkUrl(['id', 'person'], 9, rules)).toBeNull();
  });

  it('returns null for non-scalar or empty values', () => {
    expect(idLinkUrl(['showId'], { a: 1 }, rules)).toBeNull();
    expect(idLinkUrl(['showId'], null, rules)).toBeNull();
    expect(idLinkUrl(['showId'], '', rules)).toBeNull();
  });

  it('appends the value when the template has no placeholder', () => {
    expect(idLinkUrl(['x'], 7, { x: 'https://e/x/' })).toBe('https://e/x/7');
  });

  it('url-encodes the value', () => {
    expect(idLinkUrl(['x'], 'a b', { x: 'https://e/{id}' })).toBe('https://e/a%20b');
  });
});
