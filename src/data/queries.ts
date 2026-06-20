import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';

import { callRpc, type JsonRpcRequest } from '../lib/rpc';
import { fetchSmd } from '../lib/smd';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
  },
});

const RPC_TIMEOUT_MS = 30_000;

/** Loads the SMD schema for the given url; disabled while url is empty. */
export function useSmd(smdUrl: string | null, headers: Record<string, string>) {
  return useQuery({
    queryKey: ['smd', smdUrl],
    queryFn: () => fetchSmd(smdUrl as string, headers),
    enabled: Boolean(smdUrl),
  });
}

/** Invalidates the cached SMD schema so the next read refetches it. */
export function refreshSmd(smdUrl: string | null): void {
  void queryClient.invalidateQueries({ queryKey: ['smd', smdUrl] });
}

export interface RpcCall {
  request: JsonRpcRequest;
  /** Allows the caller to cancel the in-flight request. */
  signal?: AbortSignal;
}

/** Mutation that performs a JSON-RPC call against the configured endpoint. */
export function useRpc(endpoint: string | null, headers: Record<string, string>) {
  return useMutation({
    mutationFn: ({ request, signal }: RpcCall) =>
      callRpc(request, { endpoint: endpoint as string, headers, signal, timeoutMs: RPC_TIMEOUT_MS }),
  });
}
