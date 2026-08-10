import {
  existsSync,
  lstatSync,
  readlinkSync,
  symlinkSync,
  unlinkSync,
  mkdirSync,
} from 'node:fs';
import { dirname } from 'node:path';

export const STATE = Object.freeze({
  ABSENT: 'absent',
  CORRECT_SYMLINK: 'correct_symlink',
  WRONG_SYMLINK: 'wrong_symlink',
  REAL_PATH: 'real_path',
});

export function inspectPath(path, expectedTarget) {
  if (!existsSync(path) && !isDanglingSymlink(path)) {
    return { state: STATE.ABSENT };
  }

  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    return { state: STATE.ABSENT };
  }

  if (stat.isSymbolicLink()) {
    const currentTarget = readlinkSync(path);
    if (currentTarget === expectedTarget) {
      return { state: STATE.CORRECT_SYMLINK, currentTarget };
    }
    return { state: STATE.WRONG_SYMLINK, currentTarget };
  }

  return { state: STATE.REAL_PATH };
}

function isDanglingSymlink(path) {
  try {
    const stat = lstatSync(path);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

export function createSymlink(linkPath, target) {
  mkdirSync(dirname(linkPath), { recursive: true });
  symlinkSync(target, linkPath);
}

export function replaceSymlink(linkPath, target) {
  if (existsSync(linkPath) || isDanglingSymlink(linkPath)) {
    unlinkSync(linkPath);
  }
  createSymlink(linkPath, target);
}

export function removeSymlink(linkPath) {
  if (!existsSync(linkPath) && !isDanglingSymlink(linkPath)) return false;
  const stat = lstatSync(linkPath);
  if (!stat.isSymbolicLink()) {
    throw new Error(
      `Refusing to remove non-symlink during cleanup: ${linkPath}`,
    );
  }
  unlinkSync(linkPath);
  return true;
}
