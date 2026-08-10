import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const LOCK_VERSION = 1;
export const ENTRY_KIND = Object.freeze({
  SYMLINK: 'symlink',
  MANAGED_BLOCK: 'managed-block',
});

export function emptyLock({ scope, agentsRoot }) {
  return {
    version: LOCK_VERSION,
    scope,
    agents_root: agentsRoot,
    entries: [],
  };
}

export function loadLock(lockPath, { scope, agentsRoot }) {
  if (!existsSync(lockPath)) return emptyLock({ scope, agentsRoot });

  const raw = readFileSync(lockPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Lock file is not valid JSON: ${lockPath}\n${err.message}`);
  }

  if (parsed.version !== LOCK_VERSION) {
    throw new Error(
      `Lock file version mismatch: ${lockPath}\n` +
        `Expected ${LOCK_VERSION}, got ${parsed.version}.`,
    );
  }

  if (!Array.isArray(parsed.entries)) {
    throw new Error(`Lock file missing 'entries' array: ${lockPath}`);
  }

  return parsed;
}

export function saveLock(lockPath, lock) {
  mkdirSync(dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
}

export function indexEntries(lock) {
  const map = new Map();
  for (const entry of lock.entries) map.set(entry.path, entry);
  return map;
}

export function diffEntries(lockEntries, desiredEntries) {
  const lockIndex = new Map(lockEntries.map((entry) => [entry.path, entry]));
  const desiredIndex = new Map(
    desiredEntries.map((entry) => [entry.path, entry]),
  );

  const toRemove = [];
  const toAdd = [];
  const toVerify = [];

  for (const [path, entry] of lockIndex) {
    if (!desiredIndex.has(path)) toRemove.push(entry);
  }
  for (const [path, entry] of desiredIndex) {
    if (!lockIndex.has(path)) toAdd.push(entry);
    else toVerify.push({ desired: entry, locked: lockIndex.get(path) });
  }

  return { toRemove, toAdd, toVerify };
}
