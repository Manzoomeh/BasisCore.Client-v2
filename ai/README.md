# BasisCore client — skill for AI coding assistants

This folder packages what an AI assistant needs to write and debug BasisCore.js markup: the
activation rule, all 21 commands with their attributes, binding syntax, sources and triggers,
host configuration, and the pitfalls verified against the 2.39.6 source. Give it to your
assistant and it stops guessing — for example it will always add `run="atclient"` and will use
numeric merge types.

## Download

Pick the package for your tool, download it, and follow the steps below.

| Tool | Package | Extract to |
|---|---|---|
| Claude Code, Claude apps, other Agent Skills tools | [`basiscore-client-agent-skill.zip`](packages/zip/basiscore-client-agent-skill.zip) | your skills folder (below) |
| Cursor | [`basiscore-client-cursor.zip`](packages/zip/basiscore-client-cursor.zip) | project root |
| GitHub Copilot (VS Code, Visual Studio, github.com) | [`basiscore-client-copilot.zip`](packages/zip/basiscore-client-copilot.zip) | project root |
| Windsurf | [`basiscore-client-windsurf.zip`](packages/zip/basiscore-client-windsurf.zip) | project root |
| Anything else (Codex, Gemini CLI, chat assistants) | [`basiscore-client-generic.zip`](packages/zip/basiscore-client-generic.zip) | project root |

The unzipped files are also in [`packages/`](packages/) if you prefer to copy them.

## Install

### Claude Code

Extract `basiscore-client-agent-skill.zip` so that `SKILL.md` ends up at one of:

```
~/.claude/skills/basiscore-client/SKILL.md          (all your projects)
<project>/.claude/skills/basiscore-client/SKILL.md   (one project, shared with your team via git)
```

Claude loads the skill automatically when a task involves BasisCore client markup.

### Claude apps (claude.ai, desktop)

Upload `basiscore-client-agent-skill.zip` as a custom skill in the app's settings (Capabilities →
Skills). Custom skills must be enabled for your account or organisation.

### Other tools that support Agent Skills

The folder in `basiscore-client-agent-skill.zip` follows the Agent Skills format (`SKILL.md` with
`name` and `description`, plus `references/`). Put it wherever your tool looks for skills.

### Cursor

Extract `basiscore-client-cursor.zip` at the project root. It adds:

```
.cursor/rules/basiscore-client.mdc      rule, applied by the agent when relevant and to *.html, *.bc, *.inc
docs/ai/basiscore-client-reference.md   the full attribute reference the rule points to
```

### GitHub Copilot

Extract `basiscore-client-copilot.zip` at the repository root. It adds:

```
.github/instructions/basiscore-client.instructions.md   applied to *.html, *.htm, *.bc, *.inc
docs/ai/basiscore-client-reference.md                   the full reference
```

### Windsurf

Extract `basiscore-client-windsurf.zip` at the project root. It adds
`.windsurf/rules/basiscore-client.md` (applied when relevant) and the shared reference.

### Codex, Gemini CLI and other agents

Extract `basiscore-client-generic.zip` at the project root to get one self-contained file,
`docs/ai/basiscore-client.md`. Then point your agent at it:

- **Codex and other `AGENTS.md` tools** — add to `AGENTS.md`:
  `When working with BasisCore client markup (<basis run="atclient">), read docs/ai/basiscore-client.md first.`
- **Gemini CLI** — add `@docs/ai/basiscore-client.md` to `GEMINI.md`.
- **Chat assistants** — attach the file to the conversation or to a project's knowledge.

## What is inside

| File | Content |
|---|---|
| `skill/basiscore-client/SKILL.md` | Activation rule, command list, binding, verified pitfalls, known bugs |
| `skill/basiscore-client/references/commands.md` | Every command: attributes, children, caveats, example |
| `skill/basiscore-client/references/binding.md` | Tokens, run modes, built-in sources, global attributes, merge strategies, documented gaps |
| `skill/basiscore-client/references/dom-attributes.md` | `data-bc-*` markers and host configuration keys |

Some notes in the reference tables end in "…": the source notes were shortened, and the text
stops at the last complete word rather than presenting a partial sentence as whole.

## Updating

`skill/basiscore-client/` is the source. After editing it, rebuild every package:

```bash
python ai/build.py
```

and commit `ai/packages/` with the change. When the library changes, update the version and the
"Verified pitfalls" and "Known bugs" sections of `SKILL.md` first.

The skill content is MIT-licensed (see `SKILL.md`).
