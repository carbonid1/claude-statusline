#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const SETTINGS_FILE = path.join(CLAUDE_DIR, "settings.json");
const STATUSLINE_DEST = path.join(CLAUDE_DIR, "statusline.sh");
const STATUSLINE_SRC = path.resolve(__dirname, "statusline.sh");
const SKILL_SRC = path.resolve(
  __dirname,
  "..",
  "skills",
  "statusline",
  "SKILL.md"
);
const SKILL_DIR = path.join(CLAUDE_DIR, "skills", "statusline");
const SKILL_DEST = path.join(SKILL_DIR, "SKILL.md");

const blue = "\x1b[38;2;97;175;239m";
const green = "\x1b[38;2;152;195;121m";
const red = "\x1b[38;2;224;108;117m";
const yellow = "\x1b[38;2;229;192;123m";
const dim = "\x1b[2m";
const reset = "\x1b[0m";

function log(msg) {
  console.log(`  ${msg}`);
}

function success(msg) {
  console.log(`  ${green}+${reset} ${msg}`);
}

function warn(msg) {
  console.log(`  ${yellow}!${reset} ${msg}`);
}

function fail(msg) {
  console.error(`  ${red}x${reset} ${msg}`);
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`  ${question} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function checkDeps() {
  const { execSync } = require("child_process");
  const missing = [];

  for (const dep of ["jq", "curl", "git"]) {
    try {
      execSync(`which ${dep}`, { stdio: "ignore" });
    } catch {
      missing.push(dep);
    }
  }

  return missing;
}

function uninstall() {
  console.log();
  log(`${blue}Claude Statusline Uninstaller${reset}`);
  log(`${dim}${"─".repeat(29)}${reset}`);
  console.log();

  const backup = STATUSLINE_DEST + ".bak";

  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, STATUSLINE_DEST);
    fs.unlinkSync(backup);
    success(
      `Restored previous statusline from ${dim}statusline.sh.bak${reset}`
    );
  } else if (fs.existsSync(STATUSLINE_DEST)) {
    fs.unlinkSync(STATUSLINE_DEST);
    success(`Removed ${dim}statusline.sh${reset}`);
  } else {
    warn("No statusline found — nothing to remove");
  }

  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
      if (settings.statusLine) {
        delete settings.statusLine;
        fs.writeFileSync(
          SETTINGS_FILE,
          JSON.stringify(settings, null, 2) + "\n"
        );
        success(`Removed statusLine from ${dim}settings.json${reset}`);
      } else {
        success("Settings already clean");
      }
    } catch {
      fail(`Could not parse ${SETTINGS_FILE} — fix it manually`);
      process.exit(1);
    }
  }

  if (fs.existsSync(SKILL_DEST)) {
    fs.unlinkSync(SKILL_DEST);
    try {
      fs.rmdirSync(SKILL_DIR);
    } catch {}
    success(`Removed statusline skill`);
  }

  console.log();
  log(`${green}Done!${reset} Restart Claude Code to apply changes.`);
  console.log();
}

async function install() {
  console.log();
  log(`${blue}Claude Statusline Installer${reset}`);
  log(`${dim}${"─".repeat(27)}${reset}`);
  console.log();

  const missing = checkDeps();
  if (missing.length > 0) {
    fail(`Missing dependencies: ${missing.join(", ")}`);
    if (missing.includes("jq")) {
      log(`  ${dim}brew install jq${reset}  (macOS)`);
      log(`  ${dim}sudo apt install jq${reset}  (Linux)`);
    }
    process.exit(1);
  }
  success("Dependencies found (jq, curl, git)");

  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
    success(`Created ${dim}${CLAUDE_DIR}${reset}`);
  }

  const backup = STATUSLINE_DEST + ".bak";
  if (fs.existsSync(STATUSLINE_DEST)) {
    fs.copyFileSync(STATUSLINE_DEST, backup);
    warn(`Backed up existing statusline to ${dim}statusline.sh.bak${reset}`);
  }

  fs.copyFileSync(STATUSLINE_SRC, STATUSLINE_DEST);
  fs.chmodSync(STATUSLINE_DEST, 0o755);
  success(`Installed statusline to ${dim}${STATUSLINE_DEST}${reset}`);

  let settings = {};
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    } catch {
      fail(`Could not parse ${SETTINGS_FILE} — fix it manually`);
      process.exit(1);
    }
  }

  const statusLineConfig = {
    type: "command",
    command: 'bash "$HOME/.claude/statusline.sh"',
  };

  if (
    settings.statusLine &&
    settings.statusLine.type === "command" &&
    settings.statusLine.command === statusLineConfig.command
  ) {
    success("Settings already configured");
  } else {
    settings.statusLine = statusLineConfig;
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(settings, null, 2) + "\n"
    );
    success(`Updated ${dim}settings.json${reset}`);
  }

  // Skill installation — opt-in via prompt or flags
  if (fs.existsSync(SKILL_SRC)) {
    let installSkill = false;

    if (process.argv.includes("--skill")) {
      installSkill = true;
    } else if (process.argv.includes("--no-skill")) {
      installSkill = false;
    } else {
      console.log();
      log(
        `${dim}A Claude Code skill teaches Claude how to edit and extend your`
      );
      log(
        `statusline — add per-project indicators, port checks, and more.${reset}`
      );
      const answer = await ask(
        `Install the statusline editor skill? ${dim}(y/N)${reset}`
      );
      installSkill = answer === "y" || answer === "yes";
    }

    if (installSkill) {
      fs.mkdirSync(SKILL_DIR, { recursive: true });
      fs.copyFileSync(SKILL_SRC, SKILL_DEST);
      success(`Installed skill to ${dim}${SKILL_DEST}${reset}`);
    } else {
      log(`${dim}Skipped skill — you can add it later with --skill${reset}`);
    }
  }

  console.log();
  log(`${green}Done!${reset} Restart Claude Code to see your new statusline.`);
  console.log();
}

if (process.argv.includes("--uninstall")) {
  uninstall();
} else {
  install();
}
