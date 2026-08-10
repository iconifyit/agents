#!/usr/bin/env bash
#
# deploy.sh — thin, IDENTICAL across stacks. Do not edit per stack; put all
# stack-specific configuration in cli/deploy.config.sh.
#
# Loads the per-stack config, sources the generic engine, and runs it.

set -euo pipefail

# Repo root (this script lives in cli/).
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export HERE

source "$HERE/cli/deploy.config.sh"
source "$HERE/cli/deploy-lib.sh"

main "$@"
