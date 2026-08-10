import { resolve, join } from 'node:path';
import { userHome, resolveGlobalAgentsRoot } from './config.js';

export const SCOPES = Object.freeze({ USER: 'user', PROJECT: 'project' });

export function isValidScope(scope) {
  return scope === SCOPES.USER || scope === SCOPES.PROJECT;
}

export function resolveScopePaths({ scope, projectDir }) {
  if (!isValidScope(scope)) {
    throw new Error(`Invalid scope: ${scope}. Expected 'user' or 'project'.`);
  }

  if (scope === SCOPES.USER) {
    const claudeRoot = join(userHome(), '.claude');
    const agentsRoot = resolveGlobalAgentsRoot();
    return {
      scope,
      agentsRoot,
      dotAgents: join(agentsRoot, '.agents'),
      projectRoot: null,
      claudeRoot,
      skillsDir: join(claudeRoot, 'skills'),
      commandsDir: join(claudeRoot, 'commands'),
      claudeMdPath: join(claudeRoot, 'CLAUDE.md'),
      lockFilePath: join(claudeRoot, '.agentify.lock'),
    };
  }

  const projectRoot = resolve(projectDir);
  const claudeRoot = join(projectRoot, '.claude');
  return {
    scope,
    agentsRoot: projectRoot,
    dotAgents: join(projectRoot, '.agents'),
    projectRoot,
    claudeRoot,
    skillsDir: join(claudeRoot, 'skills'),
    commandsDir: join(claudeRoot, 'commands'),
    claudeMdPath: join(projectRoot, 'CLAUDE.md'),
    lockFilePath: join(claudeRoot, '.agentify.lock'),
  };
}
