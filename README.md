# claude-statusline

A statusline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) showing model info, context usage, rate limits with pace tracking, git branch, and session duration.

Atom One Dark color theme.

![demo](./.github/demo.png)

## Features

- Model name and context window usage (color-coded)
- Current directory and git branch with dirty indicator
- Session duration
- Thinking mode on/off
- 5-hour and weekly rate limit bars with reset times
- Weekly pace indicator (under/on/over expected usage)
- OAuth token auto-detection (macOS Keychain, credentials file, env var)

## Install

```bash
npx @carbonid1/claude-statusline
```

Backs up your existing statusline (if any), copies the script to `~/.claude/statusline.sh`, and configures Claude Code settings.

## Requirements

- [jq](https://jqlang.github.io/jq/) — JSON parsing
- curl — rate limit API
- git — branch info

On macOS:

```bash
brew install jq
```

## Uninstall

```bash
npx @carbonid1/claude-statusline --uninstall
```

Restores your previous statusline from backup if available.

## Credits

Originally inspired by [@kamranahmedse/claude-statusline](https://github.com/kamranahmedse/claude-statusline).

## License

MIT
