import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const BLOCK_ID = 'agentify:rules';
export const BLOCK_START = `<!-- ${BLOCK_ID}:start -->`;
export const BLOCK_END = `<!-- ${BLOCK_ID}:end -->`;

const BLOCK_REGEX = new RegExp(
  `${escapeRegex(BLOCK_START)}[\\s\\S]*?${escapeRegex(BLOCK_END)}`,
  'g',
);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildBlock(importPaths) {
  const lines = [BLOCK_START, ...importPaths.map((path) => `@${path}`), BLOCK_END];
  return lines.join('\n');
}

export function hasBlock(content) {
  return content.includes(BLOCK_START) && content.includes(BLOCK_END);
}

export function extractBlock(content) {
  const match = content.match(BLOCK_REGEX);
  return match ? match[0] : null;
}

export function upsertBlock(content, importPaths) {
  const block = buildBlock(importPaths);

  if (hasBlock(content)) {
    return content.replace(BLOCK_REGEX, block);
  }

  const trimmed = content.replace(/\s+$/, '');
  if (trimmed.length === 0) return block + '\n';
  return `${trimmed}\n\n${block}\n`;
}

export function removeBlock(content) {
  if (!hasBlock(content)) return content;
  return content.replace(BLOCK_REGEX, '').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function readClaudeMd(claudeMdPath) {
  if (!existsSync(claudeMdPath)) return '';
  return readFileSync(claudeMdPath, 'utf8');
}

export function writeClaudeMd(claudeMdPath, content) {
  writeFileSync(claudeMdPath, content, 'utf8');
}
