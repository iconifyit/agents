import { lstatSync, existsSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';

const LEGACY_NAMES = ['rules', 'workflows', 'skills', 'commands'];

function isSymlink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function pathExists(path) {
  if (existsSync(path)) return true;
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

export function detectLegacyArtifacts({ claudeRoot }) {
  const legacy = [];

  for (const name of LEGACY_NAMES) {
    const path = join(claudeRoot, name);
    if (!pathExists(path)) continue;
    if (!isSymlink(path)) continue;

    const target = readlinkSync(path);
    legacy.push({
      path: name,
      fullPath: path,
      currentTarget: target,
      reason: `legacy directory symlink at .claude/${name} (incompatible with per-file managed entries)`,
    });
  }

  return legacy;
}
