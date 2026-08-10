import { parseArgs, helpText } from './cli.js';
import { validateDotAgents } from './config.js';
import { resolveScopePaths } from './scopes.js';
import {
  buildPlan,
  loadInitialLock,
  applyPlan,
  ACTION,
} from './reconcile.js';
import { audit } from './audit.js';
import {
  formatHeader,
  formatPlan,
  formatCollisions,
  formatApplyOutcome,
  formatAuditResult,
} from './output.js';
import { confirm } from './prompt.js';

export async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 2;
  }

  if (opts.help) {
    process.stdout.write(helpText());
    return 0;
  }

  const scopePaths = resolveScopePaths({
    scope: opts.scope,
    projectDir: opts.dir,
  });

  try {
    validateDotAgents(scopePaths.dotAgents, {
      scope: opts.scope,
      agentsRoot: scopePaths.agentsRoot,
    });
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    return 1;
  }

  process.stdout.write(
    formatHeader({
      scope: opts.scope,
      scopePaths,
      agentsRoot: scopePaths.agentsRoot,
      dryRun: opts.dryRun,
      mode: opts.mode,
    }),
  );

  if (opts.mode === 'audit') {
    const result = audit({
      scope: opts.scope,
      scopePaths,
      dotAgents: scopePaths.dotAgents,
      agentsRoot: scopePaths.agentsRoot,
    });
    process.stdout.write(formatAuditResult(result) + '\n');
    return result.hasDrift ? 1 : 0;
  }

  const lock = loadInitialLock({
    scope: opts.scope,
    scopePaths,
    agentsRoot: scopePaths.agentsRoot,
  });

  const plan = buildPlan({
    scope: opts.scope,
    scopePaths,
    dotAgents: scopePaths.dotAgents,
    lock,
  });

  if (plan.collisions.length > 0) {
    process.stdout.write(formatCollisions(plan.collisions) + '\n');
    return 1;
  }

  const meaningfulSteps = plan.steps.filter(
    (step) => step.action !== ACTION.NO_OP,
  );

  if (meaningfulSteps.length === 0) {
    process.stdout.write('Nothing to do — already in sync.\n');
    return 0;
  }

  process.stdout.write(formatPlan(plan) + '\n');

  if (opts.dryRun) {
    process.stdout.write('\nDry run — no changes applied.\n');
    return 0;
  }

  if (!opts.yes) {
    const confirmed = await confirm('\nApply these changes? [y/N] ');
    if (!confirmed) {
      process.stdout.write('Aborted.\n');
      return 0;
    }
  }

  const result = applyPlan({
    plan,
    scope: opts.scope,
    scopePaths,
    agentsRoot: scopePaths.agentsRoot,
    dryRun: false,
  });

  process.stdout.write(formatApplyOutcome(result.applied) + '\n');
  return result.ok ? 0 : 1;
}
