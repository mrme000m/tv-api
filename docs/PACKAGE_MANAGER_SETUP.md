# Package Manager Setup with mise and pnpm

This project uses [pnpm](https://pnpm.io/) as the package manager, managed by [mise](https://mise.jdx.dev/). This ensures consistent development environments across all contributors.

## Why mise and pnpm?

- **mise**: A modern tool for managing runtime versions (Node.js, Python, etc.) across projects
- **pnpm**: Fast, disk space efficient package manager with strict dependency resolution

Benefits:
- Consistent Node.js versions across all environments
- Faster dependency installation
- Reduced disk space usage
- Deterministic builds

## Prerequisites

Install mise by following the instructions at [https://mise.jdx.dev/](https://mise.jdx.dev/):

```bash
# On macOS/Linux via curl
curl https://mise.run | sh

# On macOS via Homebrew
brew install mise

# On Windows via PowerShell
irm https://mise.run | iex
```

## Project Setup

Once mise is installed, setting up the project is simple:

```bash
# Clone the repository
git clone https://github.com/mrme000m/tv-api.git
cd tv-api

# Install the correct Node.js and pnpm versions (defined in .tool-versions)
mise install

# Install project dependencies with pnpm
pnpm install
```

Alternatively, you can use the provided setup script:

```bash
./scripts/setup-pnpm.sh
```

## Configuration Files

The project includes the following configuration files:

### `.tool-versions`
Defines the required versions of tools:
```
nodejs 24.11.1
pnpm latest
```

### `.mise.toml`
Mise configuration file with project-specific settings:
```toml
[tools]
node = "24.11.1"
pnpm = "latest"

[settings]
experimental = true
```

### `pnpm-workspace.yaml`
Workspace configuration for pnpm:
```yaml
packages:
  - '.'
```

### `package.json` pnpm section
Includes pnpm-specific configurations:
```json
{
  "pnpm": {
    "overrides": {},
    "packageExtensions": {}
  }
}
```

## Commands

With pnpm, use the following commands instead of npm:

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm run <script>` | `pnpm <script>` |
| `npm update` | `pnpm update` |

## Troubleshooting

### Dependencies not installing correctly
Try cleaning the installation:
```bash
pnpm run reinstall
```

### mise not recognizing versions
Make sure you're in the project directory and run:
```bash
mise install
mise exec -- pnpm install
```

### Global packages
To install global packages with pnpm:
```bash
pnpm add -g <package-name>
```

## Updating Versions

To update Node.js or pnpm versions:

1. Update `.tool-versions` with the new version
2. Update `.mise.toml` if needed
3. Update `package.json` engines field
4. Run `mise install` to install the new version
5. Run `pnpm install` to reinstall dependencies

## Migration Notes

This project was migrated from npm to pnpm. The following changes were made:

- Added `.tool-versions` and `.mise.toml` for version management
- Updated `.gitignore` to exclude npm-specific files
- Added pnpm-specific configurations to `package.json`
- Updated documentation to reflect pnpm usage
- Removed `package-lock.json` (replaced by `pnpm-lock.yaml`)