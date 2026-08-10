import { loadLock } from './lock-file.js';
import { buildPlan, ACTION } from './reconcile.js';

export function audit({ scope, scopePaths, dotAgents, agentsRoot }) {
  const lock = loadLock(scopePaths.lockFilePath, { scope, agentsRoot });
  const plan = buildPlan({ scope, scopePaths, dotAgents, lock });

  const drift = plan.steps.filter((step) => step.action !== ACTION.NO_OP);
  const hasDrift = drift.length > 0 || plan.collisions.length > 0;

  return { hasDrift, drift, collisions: plan.collisions, plan, lock };
}
