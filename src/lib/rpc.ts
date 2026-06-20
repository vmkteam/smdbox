/**
 * JSON-RPC 2.0 request/response helpers and transport.
 * Ports legacy `helpers/rpc.js` + the call logic from the MethodViewer saga,
 * adding a request timeout and cancellation (see UX_AUDIT.md 3.8).
 */

export type JsonRpcParams = Record<string, unknown> | unknown[];

export interface JsonRpcRequest {
  id: string;
  jsonrpc: '2.0';
  method: string;
  params: JsonRpcParams;
}

export interface JsonRpcError {
  code?: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse<T = unknown> {
  id?: string;
  jsonrpc?: string;
  result?: T;
  error?: JsonRpcError;
}

/** Builds a JSON-RPC 2.0 request envelope with a fresh id. */
export function createRequest(method: string, params: JsonRpcParams = {}): JsonRpcRequest {
  return { id: crypto.randomUUID(), jsonrpc: '2.0', method, params };
}

/** Request headers with the JSON content type applied. */
export function jsonHeaders(headers?: Record<string, string>): Record<string, string> {
  return { 'Content-Type': 'application/json', ...headers };
}

export interface CallOptions {
  endpoint: string;
  headers?: Record<string, string>;
  /** External cancellation (e.g. user navigated away / pressed Cancel). */
  signal?: AbortSignal;
  /** Abort the request after this many ms. Omit/0 to disable. */
  timeoutMs?: number;
}

/**
 * Sends a JSON-RPC request and returns the parsed response.
 * Throws on transport/abort errors; JSON-RPC-level errors are returned in
 * `response.error` (servers reply 200 with an error body).
 */
export async function callRpc<T = unknown>(
  request: JsonRpcRequest,
  { endpoint, headers, signal, timeoutMs }: CallOptions,
): Promise<JsonRpcResponse<T>> {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer =
    timeoutMs && timeoutMs > 0
      ? setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs)
      : undefined;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: jsonHeaders(headers),
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    return (await res.json()) as JsonRpcResponse<T>;
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
