import { readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ENTRY_KIND } from './lock-file.js';

function listDirs(parent) {
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listMarkdownFiles(parent) {
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}

export function scanAgentsRepo(dotAgents) {
  return {
    skills: listDirs(join(dotAgents, 'skills')),
    workflows: listMarkdownFiles(join(dotAgents, 'workflows')),
    rules: listMarkdownFiles(join(dotAgents, 'rules')),
  };
}

function symlinkSourceForUserScope(absoluteSourcePath) {
  return absoluteSourcePath;
}

function symlinkSourceForProjectScope(absoluteSourcePath, claudeSubdirAbs) {
  return relative(claudeSubdirAbs, absoluteSourcePath);
}

function importPathForUserScope(absoluteSourcePath) {
  return absoluteSourcePath;
}

function importPathForProjectScope(absoluteSourcePath, projectRoot) {
  const rel = relative(projectRoot, absoluteSourcePath);
  return rel.startsWith('.') ? rel : `./${rel}`;
}

export function computeDesiredState({ scope, scopePaths, dotAgents }) {
  const inventory = scanAgentsRepo(dotAgents);

  const symlinkEntries = [];

  for (const skill of inventory.skills) {
    const absoluteSource = join(dotAgents, 'skills', skill);
    const path = `skills/${skill}`;
    const source =
      scope === 'user'
        ? symlinkSourceForUserScope(absoluteSource)
        : symlinkSourceForProjectScope(absoluteSource, scopePaths.skillsDir);
    symlinkEntries.push({
      path,
      source,
      absoluteSource,
      kind: ENTRY_KIND.SYMLINK,
    });
  }

  for (const workflow of inventory.workflows) {
    const absoluteSource = join(dotAgents, 'workflows', workflow);
    const path = `commands/${workflow}`;
    const source =
      scope === 'user'
        ? symlinkSourceForUserScope(absoluteSource)
        : symlinkSourceForProjectScope(absoluteSource, scopePaths.commandsDir);
    symlinkEntries.push({
      path,
      source,
      absoluteSource,
      kind: ENTRY_KIND.SYMLINK,
    });
  }

  const ruleImportPaths = inventory.rules.map((rule) => {
    const absoluteSource = join(dotAgents, 'rules', rule);
    return scope === 'user'
      ? importPathForUserScope(absoluteSource)
      : importPathForProjectScope(absoluteSource, scopePaths.projectRoot);
  });

  const managedBlockEntry = {
    path: 'CLAUDE.md#agentify:rules',
    kind: ENTRY_KIND.MANAGED_BLOCK,
    sources: ruleImportPaths,
  };

  return { symlinkEntries, managedBlockEntry, inventory };
}
