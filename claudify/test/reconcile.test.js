import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readlinkSync,
  existsSync,
  lstatSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reconcile, ACTION } from '../src/reconcile.js';
import { audit } from '../src/audit.js';
import { resolveScopePaths } from '../src/scopes.js';
import {
  BLOCK_START,
  BLOCK_END,
  readClaudeMd,
} from '../src/managed-block.js';

function withTempProject(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'agentify-recon-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedAgents(projectDir, { rules = [], skills = [], workflows = [] }) {
  const dotAgents = join(projectDir, '.agents');
  mkdirSync(join(dotAgents, 'rules'), { recursive: true });
  mkdirSync(join(dotAgents, 'skills'), { recursive: true });
  mkdirSync(join(dotAgents, 'workflows'), { recursive: true });

  for (const rule of rules) {
    writeFileSync(join(dotAgents, 'rules', `${rule}.md`), `# ${rule}\n`);
  }
  for (const skill of skills) {
    mkdirSync(join(dotAgents, 'skills', skill));
    writeFileSync(
      join(dotAgents, 'skills', skill, 'SKILL.md'),
      `---\nname: ${skill}\ndescription: test\n---\n`,
    );
  }
  for (const workflow of workflows) {
    writeFileSync(
      join(dotAgents, 'workflows', `${workflow}.md`),
      `---\ndescription: ${workflow}\n---\nbody\n`,
    );
  }

  return { dotAgents };
}

function projectScopeArgs(projectDir) {
  const scopePaths = resolveScopePaths({ scope: 'project', projectDir });
  return {
    scope: 'project',
    scopePaths,
    dotAgents: scopePaths.dotAgents,
    agentsRoot: scopePaths.agentsRoot,
  };
}

test('reconcile symlinks each skill directory and each workflow file on first run', () => {
  withTempProject((dir) => {
    seedAgents(dir, {
      rules: ['lint', 'test'],
      skills: ['skill-a', 'skill-b'],
      workflows: ['flow-a'],
    });

    const args = projectScopeArgs(dir);
    const result = reconcile(args);

    assert.equal(result.ok, true);
    assert.equal(result.collisions.length, 0);

    const skillA = join(dir, '.claude/skills/skill-a');
    const skillB = join(dir, '.claude/skills/skill-b');
    const cmdA = join(dir, '.claude/commands/flow-a.md');

    assert.ok(lstatSync(skillA).isSymbolicLink());
    assert.ok(lstatSync(skillB).isSymbolicLink());
    assert.ok(lstatSync(cmdA).isSymbolicLink());

    const claudeMd = readClaudeMd(join(dir, 'CLAUDE.md'));
    assert.ok(claudeMd.includes(BLOCK_START));
    assert.ok(claudeMd.includes(BLOCK_END));
    assert.ok(claudeMd.includes('lint.md'));
    assert.ok(claudeMd.includes('test.md'));
  });
});

test('reconcile is idempotent — second run is a no-op', () => {
  withTempProject((dir) => {
    seedAgents(dir, { rules: ['r1'], skills: ['s1'], workflows: [] });
    const args = projectScopeArgs(dir);

    const first = reconcile(args);
    assert.equal(first.ok, true);

    const second = reconcile(args);
    assert.equal(second.ok, true);

    const nonNoop = second.plan.steps.filter(
      (step) => step.action !== ACTION.NO_OP && step.action !== ACTION.UPDATE_BLOCK,
    );
    assert.equal(nonNoop.length, 0);
  });
});

test('reconcile removes orphan entries when upstream content disappears', () => {
  withTempProject((dir) => {
    seedAgents(dir, { rules: [], skills: ['s1', 's2'], workflows: [] });
    const args = projectScopeArgs(dir);
    reconcile(args);

    rmSync(join(dir, '.agents/skills/s2'), { recursive: true });

    const second = reconcile(args);
    assert.equal(second.ok, true);
    assert.ok(!existsSync(join(dir, '.claude/skills/s2')));
    assert.ok(existsSync(join(dir, '.claude/skills/s1')));
  });
});

test('reconcile refuses on collision with a real file at managed path', () => {
  withTempProject((dir) => {
    seedAgents(dir, { rules: [], skills: ['s1'], workflows: [] });
    mkdirSync(join(dir, '.claude/skills/s1'), { recursive: true });
    writeFileSync(join(dir, '.claude/skills/s1', 'manual.md'), 'mine');

    const args = projectScopeArgs(dir);
    const result = reconcile(args);

    assert.equal(result.ok, false);
    assert.equal(result.collisions.length, 1);
    assert.equal(result.collisions[0].reason, 'real-path');
  });
});

test('reconcile cleans up legacy .claude/skills directory symlink', () => {
  withTempProject((dir) => {
    seedAgents(dir, { rules: [], skills: ['s1'], workflows: [] });

    mkdirSync(join(dir, '.claude'), { recursive: true });
    symlinkSync('../.agents/skills', join(dir, '.claude/skills'));

    const args = projectScopeArgs(dir);
    const result = reconcile(args);

    assert.equal(result.ok, true);
    const cleanup = result.plan.steps.find(
      (step) => step.action === ACTION.CLEANUP_LEGACY,
    );
    assert.ok(cleanup, 'expected a cleanup_legacy step');
    assert.equal(cleanup.legacy.path, 'skills');

    const skillsLink = join(dir, '.claude/skills/s1');
    assert.ok(lstatSync(skillsLink).isSymbolicLink());
    const target = readlinkSync(skillsLink);
    assert.ok(target.includes('skills/s1'));
  });
});

test('audit reports drift without mutating the filesystem', () => {
  withTempProject((dir) => {
    seedAgents(dir, { rules: [], skills: ['s1'], workflows: [] });
    const args = projectScopeArgs(dir);

    const result = audit(args);
    assert.equal(result.hasDrift, true);

    assert.ok(!existsSync(join(dir, '.claude/skills/s1')));
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')));
  });
});

test('audit reports no drift after reconcile', () => {
  withTempProject((dir) => {
    seedAgents(dir, { rules: ['r1'], skills: ['s1'], workflows: [] });
    const args = projectScopeArgs(dir);

    reconcile(args);
    const result = audit(args);
    assert.equal(result.hasDrift, false);
  });
});

test('reconcile dry-run does not mutate filesystem', () => {
  withTempProject((dir) => {
    seedAgents(dir, { rules: ['r1'], skills: ['s1'], workflows: [] });
    const args = projectScopeArgs(dir);

    const result = reconcile({ ...args, dryRun: true });
    assert.equal(result.ok, true);
    assert.ok(!existsSync(join(dir, '.claude/skills/s1')));
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')));
    assert.ok(!existsSync(join(dir, '.claude/.agentify.lock')));
  });
});
