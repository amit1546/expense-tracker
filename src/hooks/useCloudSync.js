import { useEffect, useRef, useState } from 'react';
import { diffDocs, fromDocs, hasData, sameMap, stableMap, toDocs } from '../lib/remote.js';
import { isDirty, setDirty } from '../lib/storage.js';
import { todayISO } from '../lib/format.js';

const DEBOUNCE_MS = 150;
const RETRY_MS = 5000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Keeps a copy of the data in the artifact's `db` (private to the viewer, shared by all their devices).
// state: { categories, expenses, recurring, budgets, meta }; replaceState(next) applies data that came from the cloud.
// Returns 'connecting' | 'cloud' | 'local' (no cloud available here) | 'error'.
//
// Rules that protect the data:
//  - nothing is written until the cloud copy has been read, so an empty device can never overwrite it;
//  - on opening, the cloud copy wins, unless this device has changes that never reached it (the unsynced flag);
//  - things the user added while the app was still connecting are kept.
export function useCloudSync(state, replaceState) {
  const [status, setStatus] = useState('connecting');
  const latest = useRef(state);
  latest.current = state;
  const initial = useRef(state);
  const replace = useRef(replaceState);
  replace.current = replaceState;
  const sync = useRef({
    ready: false,
    ref: null,
    last: {},
    timer: null,
    retry: null,
    flushing: false,
    again: false,
    deferred: false,
  });

  const flush = async () => {
    const s = sync.current;
    if (!s.ready) return;
    if (s.flushing) {
      s.again = true;
      return;
    }
    s.flushing = true;
    clearTimeout(s.retry);
    try {
      do {
        s.again = false;
        const target = toDocs(latest.current);
        const { set, remove, stableTarget } = diffDocs(s.last, target);
        for (const id of set) {
          await withRetry(() => s.ref.doc(id).set(target[id]));
          s.last[id] = stableTarget[id];
        }
        for (const id of remove) {
          await withRetry(() => s.ref.doc(id).delete());
          delete s.last[id];
        }
      } while (s.again);
      setDirty(false);
      setStatus('cloud');
    } catch {
      setStatus('error');
      s.retry = setTimeout(flush, RETRY_MS);
    } finally {
      s.flushing = false;
      catchUp();
    }
  };

  // Applies what the cloud holds if it differs from what this device last wrote or read.
  const applyRemote = (snap) => {
    const s = sync.current;
    const remote = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    const incoming = stableMap(remote);
    if (sameMap(incoming, s.last)) return; // our own write coming back
    if (snap.docs.length === 0 && Object.keys(s.last).length > 0) return; // an empty answer is not a deletion
    replace.current(fromDocs(remote, todayISO()));
    s.last = incoming;
  };

  // A change that arrived while this device was busy writing is looked at again once it is idle:
  // the cloud is re-read, so a stale snapshot can never undo something that was just saved.
  const catchUp = async () => {
    const s = sync.current;
    if (!s.deferred) return;
    if (s.flushing || s.timer) return;
    s.deferred = false;
    try {
      applyRemote(await s.ref.get());
    } catch {
      // the next snapshot will try again
    }
  };

  const schedule = () => {
    const s = sync.current;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.timer = null;
      flush();
    }, DEBOUNCE_MS);
  };

  // connect once
  useEffect(() => {
    const s = sync.current;
    let cancelled = false;
    let unsubscribe = () => {};

    const onSnapshot = (snap) => {
      if (!s.ready || snap.metadata?.fromCache || snap.metadata?.hasPendingWrites) return;
      if (s.flushing || s.timer) {
        s.deferred = true;
        return;
      }
      applyRemote(snap);
    };

    (async () => {
      try {
        const claude = globalThis.claude;
        const db = claude?.use ? await claude.use('db') : null;
        const user = claude?.use ? await claude.use('user') : null;
        const id = user ? await user.id() : null;
        if (cancelled) return;
        if (!db || !id) return setStatus('local');

        const ref = db.collection(`data/users/${id}`);
        const snap = await ref.get();
        if (cancelled) return;
        const remote = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
        const remoteEmpty = Object.keys(remote).length === 0;
        const local = latest.current;

        if (!remoteEmpty && !isDirty()) {
          const incoming = fromDocs(remote, todayISO());
          const known = (key) => new Set(initial.current[key].map((x) => x.id));
          const keep = (key) => {
            const before = known(key);
            const have = new Set(incoming[key].map((x) => x.id));
            return local[key].filter((x) => !before.has(x.id) && !have.has(x.id)); // added while connecting
          };
          replace.current({
            ...incoming,
            expenses: [...incoming.expenses, ...keep('expenses')],
            recurring: [...incoming.recurring, ...keep('recurring')],
          });
          s.last = stableMap(remote);
        } else if (remoteEmpty && !hasData(local)) {
          s.last = stableMap(toDocs(local)); // nothing worth uploading yet
        } else {
          s.last = stableMap(remote); // this device's data goes up; flush writes the difference
        }

        s.ref = ref;
        s.ready = true;
        setStatus('cloud');
        schedule();
        unsubscribe = ref.onSnapshot(onSnapshot, () => setStatus('error'));
      } catch {
        if (!cancelled) setStatus('local');
      }
    })();

    const flushNow = () => {
      clearTimeout(s.timer);
      s.timer = null;
      flush();
    };
    const onHide = () => document.visibilityState === 'hidden' && flushNow();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushNow);
    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(s.timer);
      clearTimeout(s.retry);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushNow);
    };
  }, []);

  // every change after connecting is marked as unsynced and sent shortly after
  useEffect(() => {
    const s = sync.current;
    if (!s.ready) return;
    setDirty(true);
    schedule();
  }, [state.categories, state.expenses, state.recurring, state.budgets, state.meta]);

  return status;
}

async function withRetry(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.code !== 'unavailable') throw err;
    await wait(600);
    return fn();
  }
}
