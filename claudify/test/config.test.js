import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

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
// one developer's workstation, so `--scope user` failed for everyone else.
//
// The contract is "derived from this package's own location", so the assertion
// is computed the same way rather than pinned to any particular checkout path.
// Asserting that some fixed directory exists would make the test fail whenever
// the package is copied elsewhere — even though the code would be correct.
test('default agents root is derived from the package location, not hardcoded', () => {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  assert.equal(DEFAULT_GLOBAL_AGENTS_ROOT, dirname(packageRoot));
});

test('default agents root is not the workstation path that shipped originally', () => {
  assert.notEqual(
    DEFAULT_GLOBAL_AGENTS_ROOT,
    '/Users/qia377/github/acme/cof-sandbox/acme-context',
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
