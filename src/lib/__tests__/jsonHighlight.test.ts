import { describe, expect, it } from 'vitest';

import { highlightJson } from '../jsonHighlight';

describe('highlightJson', () => {
  it('classifies keys, strings, numbers, booleans and null', () => {
    const html = highlightJson('{"name": "ann", "age": 30, "ok": true, "x": null}');
    expect(html).toContain('<span class="sb-tok-key">"name":</span>');
    expect(html).toContain('<span class="sb-tok-str">"ann"</span>');
    expect(html).toContain('<span class="sb-tok-num">30</span>');
    expect(html).toContain('<span class="sb-tok-bool">true</span>');
    expect(html).toContain('<span class="sb-tok-null">null</span>');
  });

  it('escapes HTML before highlighting (XSS-safe)', () => {
    const html = highlightJson('{"html": "<script>&</script>"}');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('handles negative and exponential numbers', () => {
    const html = highlightJson('[-1.5, 2e10]');
    expect(html).toContain('<span class="sb-tok-num">-1.5</span>');
    expect(html).toContain('<span class="sb-tok-num">2e10</span>');
  });
});
