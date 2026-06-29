# Helios Web Builder Skill

Skill for building standalone `helios-web` visualizations with Vite, `helios-web`, and `helios-network`.

## Install in Codex

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
git clone https://github.com/filipinascimento/helios-web-builder-skill.git \
  "${CODEX_HOME:-$HOME/.codex}/skills/helios-web-builder-skill"
```

Restart Codex or start a new thread. Invoke it explicitly with:

```text
Use $helios-web-builder-skill to build a standalone Helios visualization.
```

## Install in Claude

Claude Code can use the same skill folder when it is placed under the local skills directory:

```bash
mkdir -p "$HOME/.claude/skills"
git clone https://github.com/filipinascimento/helios-web-builder-skill.git \
  "$HOME/.claude/skills/helios-web-builder-skill"
```

Then ask Claude to use the skill by name:

```text
Use the helios-web-builder-skill to build a standalone helios-web visualization.
```

If your Claude setup uses a different skills directory, clone this repository there instead. The skill is self-contained and can clone `helios-web` main as a reference when needed.

## Quick Test

```bash
cd helios-web-builder-skill
node scripts/create-standalone-viz.mjs /tmp/helios-skill-demo --name helios-skill-demo --title "Helios Skill Demo"
cd /tmp/helios-skill-demo
npm install
npm run build
```
