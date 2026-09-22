#!/bin/bash
set -e

# =============================================================
# Sync agents with global ~/.claude/*
# ==============================================================

sync-agents-dev global sync --targets claude

# ==============================================================
# Sync agents index
# This will update AGENTS.md and merge the AGENTS.preamble.md 
# into it.  This also updates ~/.claude/CLAUDE.md in the 
# proper format for claude. Claude does not use `rules` 
# so they have to be imported using Claude's @import syntax.
# ==============================================================
sync-agents-dev index