import { describe, it, expect, vi, afterEach } from 'vitest';

import { createRequest, callRpc } from '../rpc';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('createRequest', () => {
  it('builds a JSON-RPC 2.0 envelope with a unique id', () => {
    const a = createRequest('Sum', { a: 1, b: 2 });
    const b = createRequest('Sum', { a: 1, b: 2 });

    expect(a).toMatchObject({ jsonrpc: '2.0', method: 'Sum', params: { a: 1, b: 2 } });
    expect(a.id).not.toBe(b.id);
  });

  it('defaults params to an empty object', () => {
    expect(createRequest('Pi').params).toEqual({});
  });
});

describe('callRpc', () => {
  it('POSTs the request and returns the parsed result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ jsonrpc: '2.0', id: '1', result: 42 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = createRequest('Multiply', { a: 6, b: 7 });
    const res = await callRpc<number>(req, {
      endpoint: '/rpc',
      headers: { Authorization: 'Bearer x' },
    });

    expect(res.result).toBe(42);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/rpc');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer x',
    });
    expect(JSON.parse(init.body)).toEqual(req);
  });

  it('returns JSON-RPC errors without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ jsonrpc: '2.0', id: '1', error: { code: 401, message: 'nope' } }),
      }),
    );

    const res = await callRpc(createRequest('Divide', { a: 1, b: 1 }), { endpoint: '/rpc' });
    expect(res.error).toEqual({ code: 401, message: 'nope' });
    expect(res.result).toBeUndefined();
  });

  it('aborts when an external signal is already aborted', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const controller = new AbortController();
    controller.abort();
    await callRpc(createRequest('Pi'), { endpoint: '/rpc', signal: controller.signal });

    expect(fetchMock.mock.calls[0]![1].signal.aborted).toBe(true);
  });

  it('aborts the request after the timeout elapses', async () => {
    // fetch that rejects when its signal aborts
    const fetchMock = vi.fn(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () =>
            reject(init.signal.reason ?? new Error('aborted')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const promise = callRpc(createRequest('Pi'), { endpoint: '/rpc', timeoutMs: 50 });
    await expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
