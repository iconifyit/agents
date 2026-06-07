#!/usr/bin/env python3
"""
Reply to each unresolved Copilot review thread with the commit SHA that
addressed it, then resolve the thread. Builds the linkage Copilot's UI
can't show on its own.
"""
import json
import subprocess
import sys
import re

# Mapping by thread "topic signature" → (addressing_commit_sha, one_line_summary).
# We match the topic against the comment body via regex so we don't have to
# hand-type databaseIds.

SERVER_MAP = [
    # Server round 3 / 4 / 6 — re-require ordering
    (r'module-reload guard.*does not actually stop the.*previous.*poller', '4f54269', 'guard now calls the previous _mailPollerStopHandler() before deregistering it, so the prior poller is cancelled rather than orphaned'),
    (r're-require.*startMailPoller.*runs before the prior poller', '4f54269', 'teardown reordered: stop prior poller → deregister prior signal handlers → install new signal handlers → start new poller (further refined in 06bb6a9 by moving start after plugin registration)'),
    (r'startMailPoller.*runs before plugins', '06bb6a9', 'startMailPoller() moved to AFTER all loader.register(...) calls so queue replay always sees the intended subscribers'),
    # (regex on body, commit_sha, summary)
    (r'parseInt.*partially-numeric|parseInt.*silently accept.*partially', '46986d7', 'parsePositiveInt now uses a /^[1-9]\\d*$/ regex match so partially-numeric values like "10ms" and "5abc" hard-error'),
    (r'constructor error message hard-codes.*event-bus.*1\.3\.0', '46986d7', 'removed the hardcoded `event-bus >= 1.3.0` from the constructor error — exact minimums belong in the package CHANGELOG, not consumer code'),
    (r'comment says `?emitSync`? resolves `?true`? for.*no subscribers', '46986d7', 'corrected the stale createMockEventBus comment to reflect emitSync 1.4.3 semantics (false = no subscribers, true = at least one handler ran)'),
    (r'`?parsePositiveInt`? treats an empty-string env var', '08aa24a', 'parsePositiveInt now normalizes undefined/null/empty-string to the fallback; only present-but-invalid values hard-error'),
    (r'hardcodes `?@vectoricons\.net/event-bus >= 1\.4\.0`?', '08aa24a', 'capability guard rewritten to be version-agnostic; points readers to the package CHANGELOG'),
    (r'`?emitSync\(\)`? is awaited but its return value is ignored', '08aa24a', '_processEntity now reads emitSync\'s boolean return; resolves to false (no subscriber) triggers recordFailure with "No subscriber registered for event …" so rows stay retryable'),
    (r'startMailPoller.*calls `?bus\.onInterval', '4f54269', 'added module-load capability guard that fails fast if event-bus is missing onInterval/offInterval, with an actionable error message'),
    (r'On module re-require.*startMailPoller\(\) runs before', '4f54269', 'reordered teardown: prior poller is stopped and signal handlers are deregistered BEFORE the new poller registers, eliminating the overlap window'),
    (r'integration test suite is now entirely skipped', '9592faf', 'skipped suite rewritten as 4 running event-driven tests against a real EventBus + mock plugin handler (queue-to-delivery, 3-retry escalation to FAILED, direct send() bypass, cancel)'),
    (r'`?initMailService`? JSDoc says `?userLookup`? is .*used by send', '9592faf', 'userLookup removed from MailService entirely; constructor, factory, and JSDoc all updated'),
    (r'JSDoc type/description for `?userLookup`? is now inaccurate', '9592faf', 'userLookup removed from MailService entirely (orphaned dep — send() takes explicit `to`, queue path uses plugin lookups)'),
    (r'`?userLookup`? is now required/stored.*no longer used', '9592faf', 'userLookup removed entirely — orphaned dep with no callers'),
    (r'module adds SIGTERM/SIGINT handlers on every require', '9592faf', 'added a `process._mailPollerStopHandler` stash so re-require deregisters the prior handler before installing the new one; eliminates the leaked-listener warning'),
    (r'`?startMailPoller`? is exported but currently a no-op', '9592faf', 'lifecycle rewritten: handle tracked in a closure so stop+start is a real restart; start is idempotent when already running'),
    (r'mockDB\.users\.query\(\) again during the expect', '9592faf', 'signup-notifications test fixed to capture the call count before the expect assertion so the assertion does not perturb the count'),
    (r'poller setInterval callback can overlap', '3adde6f', 'poller migrated to bus.onInterval which owns the in-flight guard (default allowConcurrent: false) so a slow tick blocks the next via awaitHandlers'),
    (r'parseInt\(\).*never vali', 'd3090dc', 'first-pass validation; later hardened in 08aa24a (empty-string → fallback) and 46986d7 (regex match rejects "10ms"/"5abc")'),
    # round 6:
    (r'constructor now requires.*eventBus.*emitSync.*no longer includes an assertion', '06bb6a9', 'added two constructor tests: missing eventBus throws, present-but-emitSync-less eventBus throws'),
    (r'startMailPoller\(\) runs before plugins are registered', '06bb6a9', 'startMailPoller() moved to AFTER all loader.register(...) calls so queue replay always sees the intended subscribers'),
]

EVENTBUS_MAP = [
    # Broader patterns first — these catch the cases where backticks
    # around code identifiers broke the more-specific patterns below.
    (r'safeRun.*errorHandler.*without await', 'a257101', 'safeRun now awaits config.errorHandler(error, payload) so async errorHandlers returning an Error escalate correctly instead of being swallowed'),
    (r'once.*handlers? are.*indexed in.*handlersByEvent.*emitSync.*never (clean|removed)', 'a257101', 'added a separate this.onceHandlers Map; emitSync\'s finally block walks the snapshot and calls this.off(event, handler) for any once-registration'),
    (r'once.*registrations.*added to.*handlersByEvent.*never removed', 'a257101', 'this.onceHandlers Map tracks once-registrations; emitSync cleanup removes them from all indexes after dispatch'),
    (r'onInterval.*docstring.*awaitHandlers.*scheduled relative', 'a257101', 'docstring rewritten to describe actual setInterval semantics (skip-on-overlap, not setTimeout-loop); further clarified in 9e3867a that the in-flight guard only meaningfully blocks overlap when awaitHandlers: true'),
    (r'onInterval.*docstring.*in-flight guard.*emit promise', '9e3867a', 'onInterval JSDoc rewritten to make clear the in-flight guard only meaningfully prevents overlap when awaitHandlers: true; in the default mode emit() returns synchronously so the guard clears before the next tick'),
    (r'onInterval.*intervalMs.*positive (finite )?integer', 'a257101', 'intervalMs validation switched from Number.isFinite to Number.isInteger so fractional values like 0.5 hard-error'),
    (r'onInterval.*options\.maxRuns.*integer', 'a257101', 'maxRuns validation switched to Number.isInteger'),
    (r'resolve\(\).*factory threw.*register\(\).*generically', 'a257101', 'register() now emits the specific "factory function threw during resolution" warning when the original input was a function and resolve returned null'),
    (r'AGENTS\.md.*absolute|Inherits.*absolute.*path', 'a257101', 'AGENTS.md added to .gitignore so the local-path absolute reference is no longer pushed; file stays on disk but is not tracked'),
    (r'registerAll\(\).*resolves plugin factories before calling.*register', '3320bf9', 'register() now accepts an optional pre-resolved plugin; registerAll() passes both the original input and the resolved object so factories are invoked exactly once and the "factory threw" warning still fires'),
    (r'registerAll.*register.plugin.*after pre-resolving', '3320bf9', 'register() now accepts an optional pre-resolved plugin so registerAll() does not double-invoke factories and still emits the specific "factory threw" warning'),
    (r'emitSync.*calls each handler directly.*Array\.map', '9e3867a', 'each handler invocation wrapped in Promise.resolve().then(handler) so a sync throw does NOT abort the map(). emitSync also now returns false on no-subscribers so callers can distinguish "nothing delivered" from "everything ran"'),
    (r're-spies on.*console\.warn.*beforeEach', 'e2232f6', 'redundant `jest.spyOn(console, "warn")` removed from the test body; relies on the suite-level beforeEach'),
    (r'once.*registers the wrapper via.*adapter\.once', '9c19976', 'once() now registers `wrapped` via adapter.on() and removes the registration SYNCHRONOUSLY at the start of `wrapped` (before the async safeRun). Two regression tests added: bus.off() before any emit actually cancels; emit() after emitSync() does not re-fire a once handler'),
    (r'handler config.*onError\.notify.*notifiers.*never dispatches|configured notifiers.*never invoked', '542eef5', 'notifier dispatch restored in safeRun via `_dispatchNotifiers`; BaseNotifier preserved as the interface contract for consumer subclassing'),

    # round 1 / first review
    (r'resolve.*calls plugin factory functions without a try', '542eef5', 'PluginLoader.resolve now wraps factory invocations in try/catch and logs+returns null; register() distinguishes "factory threw" from generic invalid plugin'),
    (r'handler config still documents/supports.*onError\.notify', '542eef5', 'notifier dispatch restored in safeRun (`_dispatchNotifiers`); BaseNotifier preserved as the interface contract for consumer subclassing'),
    (r'errorHandler itself throws.*notifier dispatch', '542eef5', 'errorHandler-throws path now also invokes notifier dispatch before escalating via eventbus.error'),
    (r'no-`?errorHandler`? path.*configured notifiers.*never invoked', '542eef5', 'no-errorHandler path now dispatches notifiers before escalating'),
    (r'version.*bumped as a minor release.*1\.0\.0', 'a257101', 'subsequent semver discipline adopted; current version is 1.4.4 with releases tracking actual API changes'),
    # round 2 / 08:14 batch
    (r'safeRun\(\) calls `?config\.errorHandler`?.*without awaiting', 'a257101', 'safeRun now awaits config.errorHandler(error, payload) so async errorHandlers returning an Error escalate correctly instead of being treated as truthy non-Errors and swallowed'),
    (r'onInterval\(\) docstring.*awaitHandlers.*scheduled relative to', 'a257101', 'docstring rewritten to describe actual setInterval semantics (skip-on-overlap, not setTimeout-loop); further clarified in 9e3867a that the in-flight guard only meaningfully blocks overlap when awaitHandlers: true'),
    (r'onInterval\(\).*intervalMs.*positive finite integer.*Number\.isFinite', 'a257101', 'intervalMs validation switched to Number.isInteger so fractional values like 0.5 hard-error'),
    (r'onInterval\(\).*options\.maxRuns.*integer', 'a257101', 'maxRuns validation switched to Number.isInteger'),
    (r'resolve\(\).*Factory function threw.*by `?register\(\)`?.*generically', 'a257101', 'register() now emits the specific "factory function threw during resolution" warning when the original input was a function and resolve returned null'),
    (r'AGENTS\.md (includes|"Inherits" link points to) an absolute', 'a257101', 'AGENTS.md added to .gitignore so the local-path absolute reference is no longer pushed; file stays on disk but is not tracked'),
    (r'once\(\) registrations are added to `?handlersByEvent`?.*never removed', 'a257101', 'added a separate this.onceHandlers Map; emitSync\'s finally block walks the snapshot and calls this.off(event, handler) for any entry that was a once-registration'),
    (r'once\(\) handlers are indexed in `?handlersByEvent`? for `?emitSync\(\)`?.*never cleaned', 'a257101', 'this.onceHandlers Map tracks once-registrations; emitSync cleanup removes them from all indexes after dispatch'),
    (r'handlersByEvent.*uses a `?Set`?.*deduplicates handlers', 'a257101', 'on() and once() now reject duplicate (event, handler) pairs explicitly — aligns emit() and emitSync() invocation counts and matches the Set-based bookkeeping'),
    # round 3
    (r'registerAll\(\) currently resolves plugin factories before calling `?register\(\)`?', '3320bf9', 'register() now accepts an optional pre-resolved plugin; registerAll() passes both the original input and the resolved object so factories are invoked exactly once and the specific "factory threw" warning still fires'),
    (r'registerAll\(\) calls `?this\.register\(plugin\)`? after pre-resolving', '3320bf9', 'same fix — register() now accepts an optional pre-resolved plugin so registerAll() does not double-invoke factories and still emits the specific "factory threw" warning'),
    # round 4
    (r'emitSync\(\) calls each handler directly inside `?Array\.map', '9e3867a', 'each handler invocation wrapped in Promise.resolve().then(handler) so a sync throw does NOT abort the map() — every handler is scheduled before Promise.all observes the first rejection. emitSync also now returns false on no-subscribers so callers can distinguish "nothing delivered" from "everything ran"'),
    (r'onInterval\(\) JSDoc.*in-flight guard.*emit promise hasn.?t settl', '9e3867a', 'onInterval JSDoc rewritten to make clear the in-flight guard only meaningfully prevents overlap when awaitHandlers: true; in the default mode emit() returns synchronously so the guard clears before the next tick fires'),
    # round 5
    (r'test re-spies on `?console\.warn`?.*beforeEach already', 'e2232f6', 'redundant `jest.spyOn(console, "warn")` removed from the test body; relies on the suite-level beforeEach'),
    # round 6
    (r'once\(\) registers the wrapper via `?adapter\.once\(\)`?', '9c19976', 'once() now registers `wrapped` via adapter.on() and removes the registration SYNCHRONOUSLY at the start of `wrapped` (before the async safeRun). Two regression tests added: bus.off() before any emit actually cancels; emit() after emitSync() does not re-fire a once handler'),
]


REPOS = {
    'server-v1 PR #922': {
        'owner'    : 'vectopus-org',
        'repo'     : 'vectopus-server',
        'number'   : 922,
        'threads'  : '/tmp/server-threads.json',
        'mapping'  : SERVER_MAP,
        'commit_base': 'https://github.com/vectopus-org/vectopus-server/commit/',
    },
    'event-bus PR #2': {
        'owner'    : 'iconifyit',
        'repo'     : 'event-bus',
        'number'   : 2,
        'threads'  : '/tmp/eventbus-threads.json',
        'mapping'  : EVENTBUS_MAP,
        'commit_base': 'https://github.com/iconifyit/event-bus/commit/',
    },
}


def match_topic(body, mapping):
    for pat, sha, summary in mapping:
        if re.search(pat, body, re.IGNORECASE):
            return sha, summary
    return None, None


def post_reply(owner, repo, pr_number, comment_id, body):
    """Post a reply to an existing review comment via REST API."""
    proc = subprocess.run(
        [
            'gh', 'api',
            f'repos/{owner}/{repo}/pulls/{pr_number}/comments/{comment_id}/replies',
            '-X', 'POST',
            '-f', f'body={body}',
        ],
        capture_output=True, text=True,
    )
    return proc.returncode == 0, proc.stderr if proc.returncode else proc.stdout


def resolve_thread(thread_id):
    """Mark a review thread as resolved via GraphQL."""
    proc = subprocess.run(
        [
            'gh', 'api', 'graphql',
            '-f', f'query=mutation {{ resolveReviewThread(input: {{ threadId: "{thread_id}" }}) {{ thread {{ isResolved }} }} }}',
        ],
        capture_output=True, text=True,
    )
    return proc.returncode == 0, proc.stderr if proc.returncode else proc.stdout


def process(label, cfg):
    with open(cfg['threads']) as f:
        text = f.read()
        start = text.find('{')
        d = json.loads(text[start:])
    threads = d['data']['repository']['pullRequest']['reviewThreads']['nodes']

    print(f"\n=== {label} ===")
    stats = {'replied': 0, 'resolved': 0, 'unmatched': 0, 'errors': []}

    for t in threads:
        if t['isResolved']:
            continue
        # Find the first Copilot comment in the thread
        copilot_comments = [c for c in t['comments']['nodes'] if 'copilot' in (c['author']['login'] or '').lower()]
        if not copilot_comments:
            continue
        first = copilot_comments[0]
        body = first['body'] or ''
        sha, summary = match_topic(body, cfg['mapping'])
        if not sha:
            stats['unmatched'] += 1
            snippet = body.replace('\n', ' ')[:120]
            print(f"  [UNMATCHED] thread={t['id'][-10:]} | {first['path']}:{first['line']}")
            print(f"              body: {snippet}")
            continue

        reply_body = (
            f"Addressed in [`{sha}`]({cfg['commit_base']}{sha}) — {summary}."
        )
        ok, msg = post_reply(cfg['owner'], cfg['repo'], cfg['number'], first['databaseId'], reply_body)
        if not ok:
            stats['errors'].append(f"reply to {first['databaseId']}: {msg[:200]}")
            continue
        stats['replied'] += 1

        ok, msg = resolve_thread(t['id'])
        if not ok:
            stats['errors'].append(f"resolve {t['id']}: {msg[:200]}")
            continue
        stats['resolved'] += 1

    print(f"  replied:   {stats['replied']}")
    print(f"  resolved:  {stats['resolved']}")
    print(f"  unmatched: {stats['unmatched']}")
    if stats['errors']:
        print(f"  errors ({len(stats['errors'])}):")
        for e in stats['errors'][:10]:
            print(f"    - {e}")


if __name__ == '__main__':
    for label, cfg in REPOS.items():
        process(label, cfg)
