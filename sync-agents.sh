#!/bin/bash
set -euo pipefail

BIN="sync-agents-dev"
MIN_VERSION="0.3.7"

die() { printf '\nsync-agents.sh: %s\n\n' "$1" >&2; exit 1; }

# ==============================================================
# Preflight
#
# These checks exist because both failure modes below are silent:
# the command exits 0 and writes a wrong file, so `set -e` never
# fires and nothing tells you anything went wrong.
# ==============================================================

# sync-agents walks up from the current directory looking for .agents/,
# so running this from a consuming project regenerates that project's
# AGENTS.md instead of this one — successfully, and not what you meant.
[ -d .agents ] || die "no .agents/ directory here.
  Run this from the agents repo root. Current directory: $PWD"

command -v "$BIN" >/dev/null 2>&1 || die "$BIN is not on PATH.
  Build it from the sync-agents repo, or adjust BIN in this script."

raw=$("$BIN" --version 2>&1) || die "$BIN --version failed: $raw"
core=$(printf '%s' "$raw" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
[ -n "$core" ] || die "could not read a version from: $raw"

# Compare the major.minor.patch core only. A dev build reports a Go
# pseudo-version like v0.3.7-0.20260920032444-4466e0e511cc, which strict
# SemVer orders *before* v0.3.7 because the suffix is a pre-release tag.
# Honouring that would reject the only build that currently works.
IFS=. read -r maj min pat <<<"$core"
IFS=. read -r wmaj wmin wpat <<<"$MIN_VERSION"
if (( maj < wmaj || (maj == wmaj && (min < wmin || (min == wmin && pat < wpat))) )); then
  die "$BIN is v$core, but v$MIN_VERSION or newer is required.
  Older builds regenerate AGENTS.md without the AGENTS.preamble.md body and
  exit 0. CLAUDE.md derives from AGENTS.md, so that silently strips the
  always-on instruction set from every session on this machine."
fi

printf 'sync-agents.sh: %s v%s, in %s\n' "$BIN" "$core" "$PWD"

# =============================================================
# Sync agents with global ~/.claude/*
# ==============================================================

"$BIN" global sync --targets claude

# ==============================================================
# Sync agents index
# This will update AGENTS.md and merge the AGENTS.preamble.md
# into it.  This also updates ~/.claude/CLAUDE.md in the
# proper format for claude. Claude does not use `rules`
# so they have to be imported using Claude's @import syntax.
# ==============================================================
"$BIN" index
