import { describe, it, expect } from 'vitest';

import { toCurl } from '../curl';

const body = { id: '1', jsonrpc: '2.0', method: 'Sum', params: { a: 1, b: 2 } };

describe('toCurl', () => {
  it('produces a POST command with content-type and body', () => {
    const out = toCurl('/rpc', {}, body);
    expect(out).toContain("curl -X POST '/rpc'");
    expect(out).toContain("-H 'Content-Type: application/json'");
    expect(out).toContain(`-d '${JSON.stringify(body)}'`);
  });

  it('includes custom headers', () => {
    const out = toCurl('/rpc', { Authorization: 'Bearer x' }, body);
    expect(out).toContain("-H 'Authorization: Bearer x'");
  });

  it('escapes single quotes in values', () => {
    const out = toCurl('/rpc', {}, { v: "a'b" });
    expect(out).toContain(`'\\''`);
  });
});
