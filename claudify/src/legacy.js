import { lstatSync, existsSync, readlinkSync, realpathSync } from 'node:fs';
import { join, resolve, dirname, relative, isAbsolute } from 'node:path';

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

/**
 * Resolve a symlink's target to an absolute path.
 *
 * Uses realpathSync when the target exists so that intermediate symlinks are
 * followed — the global agents root is itself commonly a symlink, and a
 * lexical comparison alone would misjudge ownership. Falls back to a lexical
 * resolve for dangling links, which still need classifying.
 */
function resolveTarget(linkPath, rawTarget) {
  const lexical = isAbsolute(rawTarget)
    ? rawTarget
    : resolve(dirname(linkPath), rawTarget);
  try {
    return realpathSync(lexical);
  } catch {
    return lexical;
  }
}

/**
 * True when `candidate` is inside `root` (or is `root` itself).
 *
 * Compares path segments rather than string prefixes so that a sibling
 * directory like `/repo-backup` is not mistaken for a child of `/repo`.
 */
function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Find legacy whole-directory symlinks under the Claude root.
 *
 * Each result is classified by ownership, which determines whether removing it
 * is safe:
 *
 * - `ours: true`  — the link resolves inside the agents repo being synced, so
 *   it is a leftover from this tool's own earlier directory-symlink layout and
 *   can be replaced with the per-file entries.
 * - `ours: false` — the link points somewhere else entirely. It belongs to the
 *   user or to another tool (`sync-agents` creates exactly these directory
 *   symlinks at project scope, and the two tools are documented to coexist).
 *   Deleting it would destroy state we do not own.
 *
 * The distinction matters because legacy cleanup runs as a planned step and
 * `--yes` skips the confirmation prompt, so an unclassified removal would take
 * out a foreign symlink with no opportunity to intervene — bypassing the
 * "refuse on collision unless managed" guarantee that the rest of the tool
 * upholds via the lock file.
 *
 * @param {object} args
 * @param {string} args.claudeRoot Directory that holds the managed entries.
 * @param {string} args.dotAgents Absolute path of the `.agents/` tree being synced.
 * @returns {Array<{path: string, fullPath: string, currentTarget: string,
 *   resolvedTarget: string, ours: boolean, reason: string}>}
 */
export function detectLegacyArtifacts({ claudeRoot, dotAgents }) {
  const legacy = [];
  const agentsRoot = dotAgents ? resolveTarget(claudeRoot, dotAgents) : null;

  for (const name of LEGACY_NAMES) {
    const path = join(claudeRoot, name);
    if (!pathExists(path)) continue;
    if (!isSymlink(path)) continue;

    const target = readlinkSync(path);
    const resolvedTarget = resolveTarget(path, target);
    const ours = agentsRoot !== null && isInside(agentsRoot, resolvedTarget);

    legacy.push({
      path: name,
      fullPath: path,
      currentTarget: target,
      resolvedTarget,
      ours,
      reason: ours
        ? `legacy directory symlink at .claude/${name} (incompatible with per-file managed entries)`
        : `directory symlink at .claude/${name} points outside the agents repo (${resolvedTarget}) — not ours to remove`,
    });
  }

  return legacy;
}
