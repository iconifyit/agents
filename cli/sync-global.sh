#!/bin/bash
#
# Fan this repo's rules, skills, and workflows out to the global Claude config
# (~/.claude) via sync-agents.
#
# Claude is the only target on purpose. The other registered tools (windsurf,
# cursor, copilot) are deliberately never synced from this repo, so this script
# takes no target argument — making it parameterizable would invite syncing
# targets that are intentionally left alone. Run sync-agents directly if you
# ever genuinely need a different target.

set -euo pipefail

echo "Syncing global configuration files to ~/.claude ..."

sync-agents-dev global sync --targets claude
