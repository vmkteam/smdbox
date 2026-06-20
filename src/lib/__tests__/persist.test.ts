import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';

import { readState, writeState, clearState } from '../persist';

describe('persist (IndexedDB)', () => {
  it('returns null when nothing is stored', async () => {
    await clearState();
    expect(await readState()).toBeNull();
  });

  it('round-trips a stored state object', async () => {
    const state = { project: { endpoint: '/rpc' }, history: { items: [1, 2, 3] } };
    await writeState(state);
    expect(await readState()).toEqual(state);
  });

  it('overwrites previous state', async () => {
    await writeState({ v: 1 });
    await writeState({ v: 2 });
    expect(await readState<{ v: number }>()).toEqual({ v: 2 });
  });

  it('clears stored state', async () => {
    await writeState({ v: 1 });
    await clearState();
    expect(await readState()).toBeNull();
  });
});
