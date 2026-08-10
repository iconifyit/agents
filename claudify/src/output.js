import { ACTION } from './reconcile.js';

function actionLabel(action) {
  switch (action) {
    case ACTION.CREATE: return 'create';
    case ACTION.REPAIR: return 'repair';
    case ACTION.REMOVE: return 'remove';
    case ACTION.NO_OP: return 'ok';
    case ACTION.UPDATE_BLOCK: return 'update CLAUDE.md block';
    case ACTION.CLEANUP_LEGACY: return 'cleanup legacy';
    default: return action;
  }
}

export function formatPlanLine(step) {
  if (step.action === ACTION.UPDATE_BLOCK) {
    const count = step.entry.sources.length;
    return `  [${actionLabel(step.action)}] ${step.entry.path} (${count} rule import${count === 1 ? '' : 's'})`;
  }
  if (step.action === ACTION.CLEANUP_LEGACY) {
    return `  [${actionLabel(step.action)}] .claude/${step.legacy.path} (was symlink -> ${step.legacy.currentTarget})`;
  }
  const target = step.entry.source ? ` -> ${step.entry.source}` : '';
  return `  [${actionLabel(step.action)}] ${step.entry.path}${target}`;
}

export function formatCollision({ entry, fullPath, inspection, reason }) {
  const lines = [
    '',
    `Collision: ${fullPath} blocks a managed entry.`,
    '',
    `  managed source: ${entry?.source ?? '(managed block)'}`,
    `  existing path:  ${fullPath} (${describeState(inspection.state, inspection.currentTarget)})`,
    '',
    'Resolution:',
    ...resolutionSteps({ fullPath, reason, inspection }),
    '',
  ];
  return lines.join('\n');
}

function describeState(state, currentTarget) {
  switch (state) {
    case 'real_path': return 'real file or directory';
    case 'wrong_symlink': return `symlink -> ${currentTarget}`;
    default: return state;
  }
}

function resolutionSteps({ fullPath, reason }) {
  if (reason === 'real-path') {
    return [
      `  - Move it aside:  mv "${fullPath}" "${fullPath}.local"`,
      `  - Or remove it if no longer needed.`,
      `  - Then re-run agentify.`,
    ];
  }
  if (reason === 'wrong-target-not-managed') {
    return [
      `  - The symlink at this path is not managed by agentify.`,
      `  - Move it aside or remove it, then re-run agentify.`,
    ];
  }
  if (reason === 'legacy-symlink-not-ours') {
    return [
      `  - This is a whole-directory symlink pointing outside the agents repo,`,
      `    so it was not created by agentify and will not be removed for you.`,
      `  - It may belong to sync-agents or to your own setup — check the target first.`,
      `  - If it is genuinely obsolete: rm "${fullPath}", then re-run agentify.`,
    ];
  }
  return ['  - Re-run agentify after resolving the conflict.'];
}

export function formatHeader({ scope, scopePaths, agentsRoot, dryRun, mode }) {
  return [
    '',
    `agentify (${mode}${dryRun ? ', dry-run' : ''})`,
    `  scope:        ${scope}`,
    `  agents root:  ${agentsRoot}`,
    `  claude root:  ${scopePaths.claudeRoot}`,
    `  CLAUDE.md:    ${scopePaths.claudeMdPath}`,
    `  lock file:    ${scopePaths.lockFilePath}`,
    '',
  ].join('\n');
}

export function formatPlan(plan) {
  const lines = ['Plan:'];
  for (const step of plan.steps) lines.push(formatPlanLine(step));
  return lines.join('\n');
}

export function formatCollisions(collisions) {
  const lines = [`Collisions detected: ${collisions.length}`];
  for (const collision of collisions) {
    lines.push(formatCollision(collision));
  }
  return lines.join('\n');
}

export function formatApplyOutcome(applied) {
  const changed = applied.filter((entry) => entry.result.applied).length;
  return `Applied ${changed} change${changed === 1 ? '' : 's'}.`;
}

export function formatResult(result, { dryRun }) {
  const lines = [];

  if (result.collisions.length > 0) {
    lines.push(`Collisions detected: ${result.collisions.length}`);
    for (const collision of result.collisions) {
      lines.push(formatCollision(collision));
    }
    return lines.join('\n');
  }

  if (result.plan.steps.length === 0) {
    lines.push('Nothing to do — already in sync.');
    return lines.join('\n');
  }

  lines.push('Plan:');
  for (const step of result.plan.steps) lines.push(formatPlanLine(step));
  lines.push('');

  if (dryRun) {
    lines.push('Dry run — no changes applied.');
  } else {
    const changed = result.applied.filter((entry) => entry.result.applied).length;
    lines.push(`Applied ${changed} change${changed === 1 ? '' : 's'}.`);
  }

  return lines.join('\n');
}

export function formatAuditResult(result) {
  const lines = [];

  if (!result.hasDrift) {
    lines.push('No drift detected.');
    return lines.join('\n');
  }

  if (result.drift.length > 0) {
    lines.push(`Drift detected: ${result.drift.length} entr${result.drift.length === 1 ? 'y' : 'ies'}`);
    for (const step of result.drift) lines.push(formatPlanLine(step));
  }

  if (result.collisions.length > 0) {
    lines.push('');
    lines.push(`Collisions: ${result.collisions.length}`);
    for (const collision of result.collisions) {
      lines.push(formatCollision(collision));
    }
  }

  return lines.join('\n');
}
