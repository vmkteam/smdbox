/**
 * IndexedDB persistence for the smdbox store. Promise-based port of legacy
 * `helpers/session.js`. DB/store/key names are kept identical so previously
 * persisted data remains readable.
 */

const DB_NAME = 'smdboxdb';
const STORE_NAME = 'smdboxstorage';
const STORAGE_KEY = 'smdboxfullstore';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const request = run(tx.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Reads the persisted state, or null when nothing is stored. */
export async function readState<T>(): Promise<T | null> {
  const value = await withStore<T | undefined>('readonly', (store) => store.get(STORAGE_KEY));
  return value ?? null;
}

/** Persists the given state, replacing any previous value. */
export async function writeState(state: unknown): Promise<void> {
  await withStore('readwrite', (store) => store.put(state, STORAGE_KEY));
}

/** Removes the persisted state. */
export async function clearState(): Promise<void> {
  await withStore('readwrite', (store) => store.delete(STORAGE_KEY));
}
