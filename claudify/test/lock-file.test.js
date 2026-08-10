import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  emptyLock,
  loadLock,
  saveLock,
  diffEntries,
  LOCK_VERSION,
  ENTRY_KIND,
} from '../src/lock-file.js';

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'agentify-test-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('emptyLock has correct version and empty entries', () => {
  const lock = emptyLock({ scope: 'user', agentsRoot: '/x' });
  assert.equal(lock.version, LOCK_VERSION);
  assert.equal(lock.scope, 'user');
  assert.equal(lock.agents_root, '/x');
  assert.deepEqual(lock.entries, []);
});

test('loadLock returns an empty lock when file does not exist', () => {
  withTempDir((dir) => {
    const lock = loadLock(join(dir, 'missing.lock'), {
      scope: 'project',
      agentsRoot: '/r',
    });
    assert.equal(lock.version, LOCK_VERSION);
    assert.deepEqual(lock.entries, []);
  });
});

test('saveLock and loadLock round-trip', () => {
  withTempDir((dir) => {
    const path = join(dir, 'sub', 'lock.json');
    const original = {
      version: LOCK_VERSION,
      scope: 'user',
      agents_root: '/r',
      entries: [
        { path: 'skills/foo', source: '/abs/foo', kind: ENTRY_KIND.SYMLINK },
      ],
    };
    saveLock(path, original);
    const loaded = loadLock(path, { scope: 'user', agentsRoot: '/r' });
    assert.deepEqual(loaded, original);
  });
});

test('loadLock rejects mismatched version', () => {
  withTempDir((dir) => {
    const path = join(dir, 'lock.json');
    writeFileSync(path, JSON.stringify({ version: 99, entries: [] }), 'utf8');
    assert.throws(
      () => loadLock(path, { scope: 'user', agentsRoot: '/r' }),
      /version mismatch/,
    );
  });
});

test('loadLock rejects malformed JSON', () => {
  withTempDir((dir) => {
    const path = join(dir, 'lock.json');
    writeFileSync(path, 'not json', 'utf8');
    assert.throws(
      () => loadLock(path, { scope: 'user', agentsRoot: '/r' }),
      /not valid JSON/,
    );
  });
});

test('diffEntries finds added, removed, and verified entries', () => {
  const locked = [
    { path: 'a', source: 'src-a', kind: ENTRY_KIND.SYMLINK },
    { path: 'b', source: 'src-b', kind: ENTRY_KIND.SYMLINK },
  ];
  const desired = [
    { path: 'b', source: 'src-b-new', kind: ENTRY_KIND.SYMLINK },
    { path: 'c', source: 'src-c', kind: ENTRY_KIND.SYMLINK },
  ];
  const { toRemove, toAdd, toVerify } = diffEntries(locked, desired);

  assert.equal(toRemove.length, 1);
  assert.equal(toRemove[0].path, 'a');
  assert.equal(toAdd.length, 1);
  assert.equal(toAdd[0].path, 'c');
  assert.equal(toVerify.length, 1);
  assert.equal(toVerify[0].desired.path, 'b');
  assert.equal(toVerify[0].locked.path, 'b');
});

test('diffEntries handles empty inputs', () => {
  const result = diffEntries([], []);
  assert.deepEqual(result.toRemove, []);
  assert.deepEqual(result.toAdd, []);
  assert.deepEqual(result.toVerify, []);
});

test('saved lock file is pretty-printed JSON', () => {
  withTempDir((dir) => {
    const path = join(dir, 'lock.json');
    saveLock(path, emptyLock({ scope: 'user', agentsRoot: '/r' }));
    const content = readFileSync(path, 'utf8');
    assert.ok(content.includes('\n'));
    assert.ok(content.endsWith('\n'));
  });
});
