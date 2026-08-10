import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  DEFAULT_GLOBAL_AGENTS_ROOT,
  resolveGlobalAgentsRoot,
  validateDotAgents,
} from '../src/config.js';

// Restore the environment after each case so tests do not leak overrides
// into one another. Both names are cleared because resolveGlobalAgentsRoot
// consults the deprecated alias as a fallback.
function withEnv(vars, fn) {
  const saved = {
    CLAUDIFY_AGENTS_ROOT: process.env.CLAUDIFY_AGENTS_ROOT,
    AGENTIFY_AGENTS_ROOT: process.env.AGENTIFY_AGENTS_ROOT,
  };
  delete process.env.CLAUDIFY_AGENTS_ROOT;
  delete process.env.AGENTIFY_AGENTS_ROOT;
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

// The regression this file exists for: the default was once a literal path to
// one developer's workstation, so `--scope user` failed for everyone else. The
// default must be derived from the package's own location, which means it
// resolves to the agents repo that actually contains this checkout.
test('default agents root is derived from the package location, not hardcoded', () => {
  assert.ok(
    existsSync(join(DEFAULT_GLOBAL_AGENTS_ROOT, '.agents')),
    `expected ${DEFAULT_GLOBAL_AGENTS_ROOT} to contain .agents/ — the default ` +
      'must resolve to the agents repo this package lives in',
  );
});

test('default agents root contains this package, proving it is not an unrelated path', () => {
  assert.ok(
    existsSync(join(DEFAULT_GLOBAL_AGENTS_ROOT, 'claudify', 'src', 'config.js')),
    'the derived root should be the repo containing claudify/src/config.js',
  );
});

test('CLAUDIFY_AGENTS_ROOT overrides the derived default', () => {
  withEnv({ CLAUDIFY_AGENTS_ROOT: '/srv/agents-repo' }, () => {
    assert.equal(resolveGlobalAgentsRoot(), '/srv/agents-repo');
  });
});

test('AGENTIFY_AGENTS_ROOT still works as a backwards-compatible alias', () => {
  withEnv({ AGENTIFY_AGENTS_ROOT: '/srv/legacy-repo' }, () => {
    assert.equal(resolveGlobalAgentsRoot(), '/srv/legacy-repo');
  });
});

test('CLAUDIFY_AGENTS_ROOT wins when both names are set', () => {
  withEnv(
    { CLAUDIFY_AGENTS_ROOT: '/srv/current', AGENTIFY_AGENTS_ROOT: '/srv/legacy' },
    () => {
      assert.equal(resolveGlobalAgentsRoot(), '/srv/current');
    },
  );
});

test('a relative override is resolved to an absolute path', () => {
  withEnv({ CLAUDIFY_AGENTS_ROOT: './some-repo' }, () => {
    const resolved = resolveGlobalAgentsRoot();
    assert.ok(resolved.startsWith('/'), `expected an absolute path, got ${resolved}`);
    assert.ok(resolved.endsWith('/some-repo'));
  });
});

test('falls back to the derived default when no override is set', () => {
  withEnv({}, () => {
    assert.equal(resolveGlobalAgentsRoot(), DEFAULT_GLOBAL_AGENTS_ROOT);
  });
});

// The user-scope error is the one a misconfigured global install actually
// hits, so it must name the variable that fixes it.
test('user-scope validation error names CLAUDIFY_AGENTS_ROOT as the remedy', () => {
  assert.throws(
    () =>
      validateDotAgents('/nonexistent/path/.agents', {
        scope: 'user',
        agentsRoot: '/nonexistent/path',
      }),
    /CLAUDIFY_AGENTS_ROOT/,
  );
});

test('project-scope validation error points at sync-agents init instead', () => {
  assert.throws(
    () =>
      validateDotAgents('/nonexistent/project/.agents', {
        scope: 'project',
        agentsRoot: '/nonexistent/project',
      }),
    /sync-agents init/,
  );
});
