import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path of the agents repo that owns the global `.agents/` tree.
 *
 * Derived from this module's own location rather than hardcoded: the file
 * lives at `<agents-repo>/claudify/src/config.js`, so the repo root is two
 * levels up. That makes a checkout work on any machine, which a literal path
 * did not — the previous constant pointed at one specific workstation, so
 * `--scope user` failed for everyone else.
 *
 * Known limitation, per ADR-002: under `npm install -g` the package lives in
 * `<prefix>/lib/node_modules/`, not in the agents repo, so this default will
 * not find `.agents/`. `CLAUDIFY_AGENTS_ROOT` is the supported override for
 * that case, and `validateDotAgents` names it in the error.
 */
const DEFAULT_GLOBAL_AGENTS_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Resolve the global agents repo root.
 *
 * `CLAUDIFY_AGENTS_ROOT` is the supported name. `AGENTIFY_AGENTS_ROOT` is
 * still honored as a backwards-compatible alias so existing shells keep
 * working through the rename; it is checked second so the new name wins when
 * both are set.
 *
 * @returns {string} Absolute path to the agents repo root.
 */
export function resolveGlobalAgentsRoot() {
  const fromEnv = process.env.CLAUDIFY_AGENTS_ROOT || process.env.AGENTIFY_AGENTS_ROOT;
  if (fromEnv) return resolve(fromEnv);
  return DEFAULT_GLOBAL_AGENTS_ROOT;
}

export function validateDotAgents(dotAgents, { scope, agentsRoot }) {
  if (!existsSync(dotAgents)) {
    if (scope === 'user') {
      throw new Error(
        `Global agents repo has no .agents/ directory: ${agentsRoot}\n` +
          `Set CLAUDIFY_AGENTS_ROOT to point at the agents repo. This is expected ` +
          `under a global npm install, where the package does not live in the repo.`,
      );
    }
    throw new Error(
      `Project has no .agents/ directory: ${agentsRoot}\n` +
        `Run 'sync-agents init' in the project first.`,
    );
  }
  return dotAgents;
}

export function userHome() {
  return homedir();
}

export { DEFAULT_GLOBAL_AGENTS_ROOT };
