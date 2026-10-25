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
# ==============================================================
# Build the artifact FIRST
#
# index rebuilds AGENTS.md from AGENTS.preamble.md plus an index of
# .agents/. It reads only this repo, so it does not depend on the
# sync below.
#
# Order matters, and this is the one that bit us. global sync mirrors
# AGENTS.md into ~/.claude/CLAUDE.md, copying whatever that file says
# at the moment it runs. With sync first, CLAUDE.md always reflected
# the PREVIOUS AGENTS.md -- harmless most of the time, until a sync
# caught AGENTS.md mid-edit and published a preamble-stripped
# CLAUDE.md to every session on this machine.
#
# Build, then distribute. Do not swap these back.
# ==============================================================
"$BIN" index

# ==============================================================
# Then distribute to the global ~/.claude/* tree
#
# Fans .agents/ out to the per-tool directories and mirrors the
# AGENTS.md built above into ~/.claude/CLAUDE.md in the form Claude
# needs: Claude has no concept of `rules`, so each one is pulled in
# through an @import line rather than the markdown links the other
# agents read.
# ==============================================================
"$BIN" global sync --targets claude
