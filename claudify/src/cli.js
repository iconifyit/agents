import { SCOPES, isValidScope } from './scopes.js';

const HELP_TEXT = `
agentify

Claudify a project: symlink shared rules/skills/workflows from a global
agents repo into Claude Code's expected layout (~/.claude/ or .claude/).

USAGE
  agentify [options]
  agentify --audit [options]
  agentify --help

OPTIONS
  --scope <user|project>   Default: project
  --dir <path>             Project directory (project scope only). Default: cwd
  --audit                  Read-only drift check; exits non-zero on drift
  --dry-run                Show planned changes without applying them or prompting
  -y, --yes                Skip the confirmation prompt
  --force                  Reserved; not currently used
  -h, --help               Show this help

ENVIRONMENT
  CLAUDIFY_AGENTS_ROOT     Override the default global agents repo location.
                           Defaults to the repo this package lives in; set this
                           when running from a global npm install.
  AGENTIFY_AGENTS_ROOT     Deprecated alias for CLAUDIFY_AGENTS_ROOT

NOTES
  Symlinks only. agentify never modifies, renames, or copies upstream
  artifacts. On collision, agentify refuses and reports a resolution.

  Default behavior shows the planned changes and prompts for confirmation
  before applying. Use --dry-run for a non-prompting preview, or --yes for
  non-interactive apply (e.g. in scripts).
`;

export function parseArgs(argv) {
  const opts = {
    scope: SCOPES.PROJECT,
    dir: process.cwd(),
    mode: 'sync',
    dryRun: false,
    force: false,
    yes: false,
    help: false,
  };

  const args = [...argv];

  while (args.length > 0) {
    const arg = args.shift();

    switch (arg) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '--audit':
        opts.mode = 'audit';
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--force':
        opts.force = true;
        break;
      case '-y':
      case '--yes':
        opts.yes = true;
        break;
      case '--scope': {
        const value = args.shift();
        if (!isValidScope(value)) {
          throw new Error(
            `Invalid --scope value: ${value}. Expected 'user' or 'project'.`,
          );
        }
        opts.scope = value;
        break;
      }
      case '--dir': {
        const value = args.shift();
        if (!value) throw new Error(`--dir requires a path argument.`);
        opts.dir = value;
        break;
      }
      default:
        throw new Error(
          `Unknown argument: ${arg}\nRun 'agentify --help' for usage.`,
        );
    }
  }

  return opts;
}

export function helpText() {
  return HELP_TEXT;
}
