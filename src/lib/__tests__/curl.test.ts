import { describe, it, expect } from 'vitest';

import { fromCurl, toCurl } from '../curl';

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

describe('fromCurl', () => {
  it('returns null for non-curl text', () => {
    expect(fromCurl('{"jsonrpc":"2.0"}')).toBeNull();
  });

  it('round-trips a command produced by toCurl', () => {
    const cmd = toCurl('https://api.example.com/rpc', { Authorization: 'Bearer x' }, body);
    const parsed = fromCurl(cmd);
    expect(parsed?.url).toBe('https://api.example.com/rpc');
    expect(parsed?.headers.Authorization).toBe('Bearer x');
    expect(parsed?.headers['Content-Type']).toBe('application/json');
    expect(parsed?.body).toEqual(body);
  });

  it('parses a single-line command with --data and double quotes', () => {
    const cmd =
      'curl -X POST "https://api.example.com/rpc" -H "Content-Type: application/json" --data "{\\"method\\":\\"user.Get\\",\\"params\\":{\\"id\\":5}}"';
    const parsed = fromCurl(cmd);
    expect(parsed?.url).toBe('https://api.example.com/rpc');
    expect(parsed?.body).toEqual({ method: 'user.Get', params: { id: 5 } });
  });

  it('handles multi-line commands with backslash continuations', () => {
    const cmd = `curl 'https://api.example.com/rpc' \\
  -H 'Content-Type: application/json' \\
  -d '{"method":"Sum","params":{"a":1}}'`;
    const parsed = fromCurl(cmd);
    expect(parsed?.url).toBe('https://api.example.com/rpc');
    expect(parsed?.body).toEqual({ method: 'Sum', params: { a: 1 } });
  });

  it('skips unrelated flags and ignores -X', () => {
    const cmd = "curl -sS -L --compressed -u user:pass -X POST 'https://x/rpc' -d '{\"params\":{}}'";
    const parsed = fromCurl(cmd);
    expect(parsed?.url).toBe('https://x/rpc');
    expect(parsed?.body).toEqual({ params: {} });
  });

  it('returns body undefined for a non-JSON payload', () => {
    const parsed = fromCurl("curl 'https://x/rpc' -d 'not json'");
    expect(parsed?.url).toBe('https://x/rpc');
    expect(parsed?.body).toBeUndefined();
  });
});
