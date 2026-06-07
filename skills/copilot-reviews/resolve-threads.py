#!/usr/bin/env python3
"""
Batch reply + resolve for accumulated Copilot review threads (the FALLBACK
cleanup pattern — the small per-round loop in SKILL.md is the common case).

Replies to each unresolved Copilot thread with the commit SHA that addressed
it, then resolves the thread — building the "what was found → where it was
fixed" linkage that Copilot's UI can't show on its own.

Usage:
    1. Fetch current thread state:
         gh api graphql -F owner=<owner> -F name=<repo> -F number=<pr> \\
           -F query=@fetch-threads.gql > /tmp/threads.json
    2. Write a config JSON (see CONFIG SCHEMA below).
    3. Run:
         python3 resolve-threads.py config.json

CONFIG SCHEMA (config.json):
    {
      "owner":       "octocat",
      "repo":        "hello-world",
      "number":      123,
      "threads":     "/tmp/threads.json",      # output of fetch-threads.gql
      "commit_base": "https://github.com/octocat/hello-world/commit/",
      "reply_delay_seconds": 12,               # >=12 avoids GitHub's abuse limiter
      "mapping": [
        ["<regex matched against the thread's first Copilot comment body>",
         "<addressing commit SHA>",
         "<one-line summary of the fix>"],
        ...
      ]
    }

Notes:
  - `mapping` is ordered; the FIRST regex that matches a thread's body wins, so
    list broader patterns AFTER more specific ones.
  - Unmatched threads are reported (with a body snippet) and left untouched —
    inspect them, extend the mapping, and re-run. Re-running is safe: resolved
    threads are skipped.
  - Replies are paced `reply_delay_seconds` apart. GitHub flags rapid bursts
    (~25-30 back-to-back) with HTTP 422 abuse; cooldown is ~1 hour.
"""
import json
import re
import subprocess
import sys
import time


def load_threads(path):
    """Read fetch-threads.gql output; tolerate a leading non-JSON preamble."""
    with open(path) as f:
        text = f.read()
    start = text.find('{')
    if start < 0:
        raise ValueError(f"no JSON object found in {path}")
    data = json.loads(text[start:])
    return data['data']['repository']['pullRequest']['reviewThreads']['nodes']


def match_topic(body, mapping):
    """Return (sha, summary) for the first regex that matches, else (None, None)."""
    for pattern, sha, summary in mapping:
        if re.search(pattern, body, re.IGNORECASE):
            return sha, summary
    return None, None


def post_reply(owner, repo, number, comment_id, body):
    """Reply to an existing review comment via the PR-scoped REST endpoint."""
    proc = subprocess.run(
        [
            'gh', 'api',
            f'repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies',
            '-X', 'POST',
            '-f', f'body={body}',
        ],
        capture_output=True, text=True,
    )
    return proc.returncode == 0, (proc.stderr if proc.returncode else proc.stdout)


def resolve_thread(thread_id):
    """Mark a review thread resolved via the GraphQL resolveReviewThread mutation."""
    proc = subprocess.run(
        [
            'gh', 'api', 'graphql',
            '-f', (
                'query=mutation { resolveReviewThread('
                f'input: {{ threadId: "{thread_id}" }}) '
                '{ thread { isResolved } } }'
            ),
        ],
        capture_output=True, text=True,
    )
    return proc.returncode == 0, (proc.stderr if proc.returncode else proc.stdout)


def process(cfg):
    owner = cfg['owner']
    repo = cfg['repo']
    number = cfg['number']
    mapping = cfg['mapping']
    commit_base = cfg.get('commit_base', '')
    delay = cfg.get('reply_delay_seconds', 12)

    threads = load_threads(cfg['threads'])
    stats = {'replied': 0, 'resolved': 0, 'unmatched': 0, 'errors': []}

    for thread in threads:
        if thread['isResolved']:
            continue
        copilot_comments = [
            c for c in thread['comments']['nodes']
            if 'copilot' in ((c.get('author') or {}).get('login') or '').lower()
        ]
        if not copilot_comments:
            continue

        first = copilot_comments[0]
        body = first['body'] or ''
        sha, summary = match_topic(body, mapping)
        if not sha:
            stats['unmatched'] += 1
            snippet = body.replace('\n', ' ')[:120]
            print(f"  [UNMATCHED] thread={thread['id'][-10:]} | "
                  f"{first['path']}:{first.get('line') or first.get('originalLine')}")
            print(f"              body: {snippet}")
            continue

        link = f"[`{sha}`]({commit_base}{sha})" if commit_base else f"`{sha}`"
        reply_body = f"Addressed in {link} — {summary}."

        ok, msg = post_reply(owner, repo, number, first['databaseId'], reply_body)
        if not ok:
            stats['errors'].append(f"reply to {first['databaseId']}: {msg[:200]}")
            continue
        stats['replied'] += 1

        ok, msg = resolve_thread(thread['id'])
        if not ok:
            stats['errors'].append(f"resolve {thread['id']}: {msg[:200]}")
            continue
        stats['resolved'] += 1

        time.sleep(delay)  # stay under GitHub's abuse limiter

    print(f"\n=== {owner}/{repo} PR #{number} ===")
    print(f"  replied:   {stats['replied']}")
    print(f"  resolved:  {stats['resolved']}")
    print(f"  unmatched: {stats['unmatched']}")
    if stats['errors']:
        print(f"  errors ({len(stats['errors'])}):")
        for err in stats['errors'][:10]:
            print(f"    - {err}")


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    with open(sys.argv[1]) as f:
        cfg = json.load(f)
    process(cfg)


if __name__ == '__main__':
    main()
