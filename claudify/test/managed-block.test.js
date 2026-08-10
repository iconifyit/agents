import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBlock,
  hasBlock,
  upsertBlock,
  removeBlock,
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
