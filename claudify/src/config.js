import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DEFAULT_GLOBAL_AGENTS_ROOT = '/Users/qia377/github/acme/cof-sandbox/acme-context';

export function resolveGlobalAgentsRoot() {
  const fromEnv = process.env.AGENTIFY_AGENTS_ROOT;
  if (fromEnv) return resolve(fromEnv);
  return DEFAULT_GLOBAL_AGENTS_ROOT;
}

export function validateDotAgents(dotAgents, { scope, agentsRoot }) {
  if (!existsSync(dotAgents)) {
    if (scope === 'user') {
      throw new Error(
        `Global agents repo has no .agents/ directory: ${agentsRoot}\n` +
          `Set AGENTIFY_AGENTS_ROOT to override the default.`,
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
