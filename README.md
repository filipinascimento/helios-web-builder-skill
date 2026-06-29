# Helios Web Builder Skill

Skill for building standalone `helios-web` visualizations with Vite, `helios-web`, and `helios-network`.

The skill includes:

- a Codex/Claude-compatible `SKILL.md`
- focused reference notes for setup, data loading, UI, Helios APIs, Netzschleuder, and verification
- a minimal copyable Vite standalone template
- a richer analytics-interface Vite template inspired by the existing funding, Luddy, and multiplex standalone apps
- reusable DOM/CSS snippets for sliders, log sliders, range controls, segmented controls, checklist filters, relationship browsers, quick controls, info panels, and hover cards
- small conversion scripts for XNET, ZXNET, and multiplex CSV-style payloads
- remote-query app guidance for live API probing, visible download caps, progress, cancellation, and persistence-free startup
- helper scripts for cloning the current `helios-web` reference repo and creating a starter app

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
