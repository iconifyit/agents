import { join } from 'node:path';
import {
  loadLock,
  saveLock,
  emptyLock,
  diffEntries,
  ENTRY_KIND,
} from './lock-file.js';
import { computeDesiredState } from './desired-state.js';
import {
  inspectPath,
  createSymlink,
  replaceSymlink,
  removeSymlink,
  STATE,
} from './symlinks.js';
import {
  readClaudeMd,
  writeClaudeMd,
  upsertBlock,
  removeBlock,
  BLOCK_ID,
} from './managed-block.js';
import { detectLegacyArtifacts } from './legacy.js';

export const ACTION = Object.freeze({
  CREATE: 'create',
  REPAIR: 'repair',
  REMOVE: 'remove',
  NO_OP: 'no_op',
  UPDATE_BLOCK: 'update_block',
  CLEANUP_LEGACY: 'cleanup_legacy',
});

export class CollisionError extends Error {
  constructor({ path, source, existingState, currentTarget }) {
    super(`Collision at ${path}`);
    this.name = 'CollisionError';
    this.path = path;
    this.source = source;
    this.existingState = existingState;
    this.currentTarget = currentTarget;
  }
}

function entryKey(entry) {
  return entry.path;
}

function buildLockEntry(entry) {
  if (entry.kind === ENTRY_KIND.SYMLINK) {
    return { path: entry.path, source: entry.source, kind: entry.kind };
  }
  if (entry.kind === ENTRY_KIND.MANAGED_BLOCK) {
    return { path: entry.path, sources: entry.sources, kind: entry.kind };
  }
  throw new Error(`Unknown entry kind: ${entry.kind}`);
}

function planSymlink({ entry, scopePaths, lockedEntry, legacyTopLevels }) {
  const fullPath = join(scopePaths.claudeRoot, entry.path);
  const topLevel = entry.path.split('/')[0];

  if (legacyTopLevels.has(topLevel)) {
    return { action: ACTION.CREATE, entry, fullPath, inspection: { state: STATE.ABSENT } };
  }

  const inspection = inspectPath(fullPath, entry.source);

  if (inspection.state === STATE.ABSENT) {
    return { action: ACTION.CREATE, entry, fullPath, inspection };
  }

  if (inspection.state === STATE.CORRECT_SYMLINK) {
    return { action: ACTION.NO_OP, entry, fullPath, inspection };
  }

  if (inspection.state === STATE.WRONG_SYMLINK) {
    if (lockedEntry) {
      return { action: ACTION.REPAIR, entry, fullPath, inspection };
    }
    return {
      action: 'collision',
      entry,
      fullPath,
      inspection,
      reason: 'wrong-target-not-managed',
    };
  }

  return {
    action: 'collision',
    entry,
    fullPath,
    inspection,
    reason: 'real-path',
  };
}

function planRemoval({ lockedEntry, scopePaths }) {
  const fullPath = join(scopePaths.claudeRoot, lockedEntry.path);
  return { action: ACTION.REMOVE, entry: lockedEntry, fullPath };
}

export function buildPlan({ scope, scopePaths, dotAgents, lock }) {
  const desired = computeDesiredState({ scope, scopePaths, dotAgents });

  const desiredSymlinkEntries = desired.symlinkEntries;
  const lockedSymlinkEntries = lock.entries.filter(
    (entry) => entry.kind === ENTRY_KIND.SYMLINK,
  );

  const { toRemove, toAdd, toVerify } = diffEntries(
    lockedSymlinkEntries,
    desiredSymlinkEntries,
  );

  const lockedIndex = new Map(lock.entries.map((entry) => [entryKey(entry), entry]));

  const steps = [];
  const collisions = [];

  const legacy = detectLegacyArtifacts({
    claudeRoot: scopePaths.claudeRoot,
    dotAgents,
  });
  const legacyTopLevels = new Set(legacy.map((item) => item.path));
  for (const item of legacy) {
    if (item.ours) {
      steps.push({ action: ACTION.CLEANUP_LEGACY, legacy: item });
      continue;
    }
    // Not ours: refuse rather than delete. Legacy cleanup is a planned step and
    // --yes skips the prompt, so removing a foreign directory symlink would
    // destroy another tool's state with no chance to intervene.
    collisions.push({
      entry: { path: item.path, source: null },
      fullPath: item.fullPath,
      inspection: { state: 'wrong_symlink', currentTarget: item.currentTarget },
      reason: 'legacy-symlink-not-ours',
    });
  }

  for (const entry of toAdd) {
    const result = planSymlink({
      entry,
      scopePaths,
      lockedEntry: null,
      legacyTopLevels,
    });
    if (result.action === 'collision') {
      collisions.push(result);
    } else {
      steps.push(result);
    }
  }

  for (const { desired: entry, locked } of toVerify) {
    const result = planSymlink({
      entry,
      scopePaths,
      lockedEntry: locked,
      legacyTopLevels,
    });
    if (result.action === 'collision') {
      collisions.push(result);
    } else {
      steps.push(result);
    }
  }

  for (const entry of toRemove) {
    steps.push(planRemoval({ lockedEntry: entry, scopePaths }));
  }

  const lockedBlock = lockedIndex.get(desired.managedBlockEntry.path);
  const blockChanged =
    !lockedBlock ||
    !arraysEqual(lockedBlock.sources ?? [], desired.managedBlockEntry.sources);

  if (blockChanged) {
    steps.push({
      action: ACTION.UPDATE_BLOCK,
      entry: desired.managedBlockEntry,
      changed: blockChanged,
    });
  }

  return { steps, collisions, desired };
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function applyStep(step, { scopePaths, dryRun }) {
  if (dryRun) return { applied: false, dryRun: true };

  switch (step.action) {
    case ACTION.CLEANUP_LEGACY:
      removeSymlink(step.legacy.fullPath);
      return { applied: true };
    case ACTION.CREATE:
      createSymlink(step.fullPath, step.entry.source);
      return { applied: true };
    case ACTION.REPAIR:
      replaceSymlink(step.fullPath, step.entry.source);
      return { applied: true };
    case ACTION.REMOVE:
      removeSymlink(step.fullPath);
      return { applied: true };
    case ACTION.NO_OP:
      return { applied: false };
    case ACTION.UPDATE_BLOCK: {
      const existing = readClaudeMd(scopePaths.claudeMdPath);
      const next =
        step.entry.sources.length === 0
          ? removeBlock(existing)
          : upsertBlock(existing, step.entry.sources);
      if (next !== existing) {
        writeClaudeMd(scopePaths.claudeMdPath, next);
        return { applied: true };
      }
      return { applied: false };
    }
    default:
      throw new Error(`Unknown action: ${step.action}`);
  }
}

function buildNextLock({ scope, agentsRoot, plan }) {
  const next = emptyLock({ scope, agentsRoot });
  const surviving = new Map();

  for (const step of plan.steps) {
    if (step.action === ACTION.REMOVE) continue;
    if (step.action === ACTION.CLEANUP_LEGACY) continue;
    if (step.action === ACTION.UPDATE_BLOCK) {
      surviving.set(step.entry.path, buildLockEntry(step.entry));
      continue;
    }
    if (step.action === ACTION.NO_OP || step.action === ACTION.CREATE || step.action === ACTION.REPAIR) {
      surviving.set(step.entry.path, buildLockEntry(step.entry));
    }
  }

  if (!surviving.has(plan.desired.managedBlockEntry.path)) {
    surviving.set(
      plan.desired.managedBlockEntry.path,
      buildLockEntry(plan.desired.managedBlockEntry),
    );
  }

  next.entries = Array.from(surviving.values());
  return next;
}

export function reconcile({
  scope,
  scopePaths,
  dotAgents,
  agentsRoot,
  dryRun = false,
}) {
  const lock = loadLock(scopePaths.lockFilePath, { scope, agentsRoot });
  const plan = buildPlan({ scope, scopePaths, dotAgents, lock });

  if (plan.collisions.length > 0) {
    return {
      ok: false,
      lock,
      plan,
      applied: [],
      collisions: plan.collisions,
    };
  }

  const applied = [];
  for (const step of plan.steps) {
    const result = applyStep(step, { scopePaths, dryRun });
    applied.push({ step, result });
  }

  if (!dryRun) {
    const nextLock = buildNextLock({ scope, agentsRoot, plan });
    saveLock(scopePaths.lockFilePath, nextLock);
    return { ok: true, lock: nextLock, plan, applied, collisions: [] };
  }

  return { ok: true, lock, plan, applied, collisions: [] };
}

export function loadInitialLock({ scope, scopePaths, agentsRoot }) {
  return loadLock(scopePaths.lockFilePath, { scope, agentsRoot });
}

export function applyPlan({
  plan,
  scope,
  scopePaths,
  agentsRoot,
  dryRun = false,
}) {
  if (plan.collisions.length > 0) {
    return { ok: false, applied: [], lock: null };
  }

  const applied = [];
  for (const step of plan.steps) {
    const result = applyStep(step, { scopePaths, dryRun });
    applied.push({ step, result });
  }

  if (!dryRun) {
    const nextLock = buildNextLock({ scope, agentsRoot, plan });
    saveLock(scopePaths.lockFilePath, nextLock);
    return { ok: true, applied, lock: nextLock };
  }

  return { ok: true, applied, lock: null };
}

export { BLOCK_ID };
