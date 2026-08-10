import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildBlock,
  hasBlock,
  upsertBlock,
  removeBlock,
  writeClaudeMd,
  BLOCK_START,
  BLOCK_END,
} from '../src/managed-block.js';

test('buildBlock produces fenced @-import lines', () => {
  const result = buildBlock(['/abs/path/a.md', '/abs/path/b.md']);
  assert.equal(
    result,
    `${BLOCK_START}\n@/abs/path/a.md\n@/abs/path/b.md\n${BLOCK_END}`,
  );
});

test('buildBlock with empty list produces just the fence', () => {
  const result = buildBlock([]);
  assert.equal(result, `${BLOCK_START}\n${BLOCK_END}`);
});

test('hasBlock detects an existing block', () => {
  const content = `# Heading\n\n${BLOCK_START}\n@/x.md\n${BLOCK_END}\n\nMore text.`;
  assert.equal(hasBlock(content), true);
});

test('hasBlock returns false when fence is absent', () => {
  assert.equal(hasBlock('# Heading\n\nNo block here.'), false);
});

test('upsertBlock appends a new block to non-empty content', () => {
  const before = '# Heading\n\nExisting content.\n';
  const result = upsertBlock(before, ['/abs/a.md']);
  assert.ok(result.includes('# Heading'));
  assert.ok(result.includes('Existing content.'));
  assert.ok(result.includes(`${BLOCK_START}\n@/abs/a.md\n${BLOCK_END}`));
});

test('upsertBlock replaces an existing block in place', () => {
  const before = `# Heading\n\nText before.\n\n${BLOCK_START}\n@/old/a.md\n${BLOCK_END}\n\nText after.\n`;
  const result = upsertBlock(before, ['/new/a.md', '/new/b.md']);
  assert.ok(result.includes('Text before.'));
  assert.ok(result.includes('Text after.'));
  assert.ok(result.includes('@/new/a.md'));
  assert.ok(result.includes('@/new/b.md'));
  assert.ok(!result.includes('@/old/a.md'));
});

test('upsertBlock writes only the block when content is empty', () => {
  const result = upsertBlock('', ['/abs/a.md']);
  assert.ok(result.startsWith(BLOCK_START));
  assert.ok(result.trimEnd().endsWith(BLOCK_END));
});

test('removeBlock strips an existing block and trims trailing whitespace', () => {
  const before = `# Heading\n\n${BLOCK_START}\n@/a.md\n${BLOCK_END}\n\nMore.\n`;
  const result = removeBlock(before);
  assert.ok(!result.includes(BLOCK_START));
  assert.ok(!result.includes('@/a.md'));
  assert.ok(result.includes('# Heading'));
  assert.ok(result.includes('More.'));
});

test('removeBlock is a no-op when no block exists', () => {
  const before = '# Heading\n\nNo block.\n';
  assert.equal(removeBlock(before), before);
});

test('upsertBlock then removeBlock round-trips to similar content', () => {
  const before = '# Heading\n\nBody text.\n';
  const withBlock = upsertBlock(before, ['/x.md']);
  const back = removeBlock(withBlock);
  assert.ok(back.includes('# Heading'));
  assert.ok(back.includes('Body text.'));
  assert.ok(!back.includes(BLOCK_START));
});

// Regression: a plan whose only step is UPDATE_BLOCK runs no symlink steps, so
// nothing else creates the scope directory. That happens on a fresh machine
// under `--scope user`, or when the agents repo has rules but no skills or
// workflows. writeClaudeMd previously threw ENOENT on that otherwise-valid plan.
test('writeClaudeMd creates the parent directory when it does not exist', () => {
  const base = mkdtempSync(join(tmpdir(), 'claudify-mb-'));
  const target = join(base, 'fresh-scope', 'CLAUDE.md');

  assert.equal(existsSync(dirname(target)), false, 'parent must not exist for this test to mean anything');

  writeClaudeMd(target, '# hello\n');

  assert.equal(readFileSync(target, 'utf8'), '# hello\n');
});

test('writeClaudeMd still overwrites when the parent already exists', () => {
  const base = mkdtempSync(join(tmpdir(), 'claudify-mb-'));
  const target = join(base, 'CLAUDE.md');

  writeClaudeMd(target, 'first\n');
  writeClaudeMd(target, 'second\n');

  assert.equal(readFileSync(target, 'utf8'), 'second\n');
});
