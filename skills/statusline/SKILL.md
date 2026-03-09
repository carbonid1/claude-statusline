# Statusline Editor

Edit, extend, and create Claude Code statusline scripts. Covers the 2-tier system installed by `@carbonid1/claude-statusline`: a global script with Atom One Dark theming, rate limits, git info — and per-project decorator scripts that wrap global output and append project-specific indicators.

## Trigger Description

edit statusline, modify status bar, add statusline indicator, statusline script, status line section, server status indicator, port check indicator, new project statusline, statusline color, statusline setting

## Architecture

### 2-Tier System

```
Global script (~/.claude/statusline.sh)
  └── Per-project decorator (.claude/statusline.sh) — wraps global, appends project section
```

- **Global script** — model info, context %, directory + git branch, session timer, thinking toggle, rate limits (5h + 7d with pace indicator). Fetches OAuth usage from `api.anthropic.com` with 60s disk cache at `/tmp/claude/statusline-usage-cache.json`.
- **Per-project decorator** — runs global script, captures output, splits line 1 from rest, appends project indicators to line 1, passes remaining lines through unchanged. Each repo can have its own.

### Settings Precedence

| Level | File | statusLine value |
|-------|------|------------------|
| Global | `~/.claude/settings.json` | `bash "$HOME/.claude/statusline.sh"` |
| Project | `.claude/settings.local.json` | `.claude/statusline.sh` (relative) |

Project-level `settings.local.json` overrides global. The project script internally calls the global script, so both layers run.

`settings.local.json` should be gitignored — it's user-local config, not checked in.

### JSON Input

Claude Code pipes a JSON object to stdin with these fields:

```
.model.display_name           — "Claude 4.6 Opus", etc.
.context_window.context_window_size
.context_window.current_usage.input_tokens
.context_window.current_usage.cache_creation_input_tokens
.context_window.current_usage.cache_read_input_tokens
.cwd                          — current working directory
.session.start_time           — ISO 8601 timestamp
```

Always guard with `// default` in jq and handle empty input (just print "Claude" and exit).

## Color Palette (Atom One Dark)

All scripts use 24-bit ANSI (`\033[38;2;R;G;Bm`):

```bash
blue='\033[38;2;97;175;239m'      # model name, headers
orange='\033[38;2;229;192;123m'   # warning thresholds (70-89%)
green='\033[38;2;152;195;121m'    # ok/healthy, git branch, under pace
cyan='\033[38;2;86;182;194m'      # directory name
red='\033[38;2;224;108;117m'      # critical thresholds (90%+), git dirty
yellow='\033[38;2;229;192;123m'   # caution thresholds (50-69%)
white='\033[38;2;171;178;191m'    # labels, secondary text
magenta='\033[38;2;198;120;221m'  # project separator ┃, thinking
dim='\033[2m'                     # inactive/off states, separators
reset='\033[0m'
```

Separator: `" ${dim}│${reset} "` (thin pipe with spaces, used between global sections)
Project separator: `" ${magenta}┃${reset} "` (thick pipe, visually distinct from global)

## Per-Project Decorator Template

Every project decorator follows this pattern:

```bash
#!/bin/bash
# {Project} statusline — extends global with {what}
set -f

input=$(cat)

GLOBAL_SCRIPT="$HOME/.claude/statusline.sh"

# ── Run global statusline ─────────────────────────────
if [ -x "$GLOBAL_SCRIPT" ]; then
    global_output=$("$GLOBAL_SCRIPT" <<< "$input")
else
    global_output="Claude"
fi

# ── Colors (Atom One Dark — matches global palette) ───
green='\033[38;2;152;195;121m'
magenta='\033[38;2;198;120;221m'
white='\033[38;2;171;178;191m'
dim='\033[2m'
reset='\033[0m'
# ... only declare colors you actually use

# ── Project indicators ───────────────────────────────
# ... your logic here ...

# ── Compose output ────────────────────────────────────
project=" ${magenta}┃${reset} ${indicators}"

first_line="${global_output%%$'\n'*}"
rest=""
if [[ "$global_output" == *$'\n'* ]]; then
    rest="${global_output#*$'\n'}"
fi

printf "%b%b" "$first_line" "$project"
[ -n "$rest" ] && printf "\n%b" "$rest"

exit 0
```

After creating the script, make it executable and add a `.claude/settings.local.json`:

```bash
chmod +x .claude/statusline.sh
```

```json
{
  "statusLine": {
    "type": "command",
    "command": ".claude/statusline.sh"
  }
}
```

## Common Indicator Patterns

### Port check (service up/down)

```bash
# ~5ms per check
if lsof -i :PORT -sTCP:LISTEN >/dev/null 2>&1; then
    ind="${green}●${reset} ${white}label${reset}"
else
    ind="${dim}○ label${reset}"
fi
```

### Environment variable check

```bash
if [ -n "$MY_VAR" ]; then
    ind="${green}●${reset} ${white}label${reset}"
else
    ind="${dim}○ label${reset}"
fi
```

### File existence check

```bash
if [ -f "path/to/file" ]; then
    ind="${green}●${reset} ${white}label${reset}"
else
    ind="${dim}○ label${reset}"
fi
```

### Multiple indicators — separate with double space

```bash
project=" ${magenta}┃${reset} ${ind1}  ${ind2}  ${ind3}"
```

## Performance Rules

- Total script execution must be **<50ms** (blocks statusline render)
- `lsof` port checks: ~5ms each — fine for 2-3 ports
- Network calls: **always cache** with TTL (global uses 60s for rate limit API)
- Cache location: `/tmp/claude/` (survives session, cleared on reboot)
- Avoid subshells and pipes where possible — prefer bash builtins

## Modifying the Global Script

The global script lives at `~/.claude/statusline.sh`. To add new sections:

1. Add logic between the helpers and `# ── Output ──` sections
2. Build into `line1` (single-line info) or add new lines after `rate_lines`
3. Use `${sep}` between line1 sections
4. Follow color thresholds: green (<50%), yellow (50-69%), orange (70-89%), red (90%+)

Note: edits to the global script will be overwritten on next `npx @carbonid1/claude-statusline` update. For project-specific indicators, use a per-project decorator instead.
