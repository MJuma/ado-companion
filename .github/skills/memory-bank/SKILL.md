---
name: memory-bank
description: Query, add to, or maintain the ADO Companion memory bank of gotchas, decisions, issues, and patterns
---

# Memory Bank

`.github/memory-bank.md` is a grep-searchable log of repo-specific facts. Format: one line per entry — `[tag] topic: description` — under a `# ── Section ──` header.

## Query

```bash
grep '\[gotcha\]' .github/memory-bank.md      # by tag
grep -i 'fluent' .github/memory-bank.md        # by topic
```

## Adding Entries

Append to the appropriate section in `.github/memory-bank.md`. Follow the format exactly:

```
[tag] topic: description
```

### Tags

| Tag | When to use | Example |
|-----|------------|---------|
| `[gotcha]` | Something that bites you if you don't know it | `[gotcha] solid-shadow-events: use on:click, not onClick, inside Shadow DOM` |
| `[decision]` | A deliberate choice with rationale | `[decision] stack: SolidJS + Fluent Web Components on WXT` |
| `[issue]` | A bug encountered and how it was resolved | `[issue] ff-build: firefox build failed because ...` |
| `[perf]` | A performance insight | `[perf] bundle: Solid keeps the content script ~24KB before Fluent` |
| `[pattern]` | A code pattern or convention | `[pattern] fluent-register: import '@fluentui/web-components/<x>/define.js'` |
| `[data]` | A fact about deps/data | `[data] fluent-versions: web-components 3.0.0-rc.24, tokens 1.0.0-alpha.23` |

### Rules

- **Be concise**: one line per entry. If it needs more, it belongs in a lazy-instruction.
- **Be specific**: include the exact value, path, import, or error message.
- **Be factual**: only add what you've verified. Cite files if helpful.
- **Use kebab-case topics**: `wxt-import-paths`, `solid-shadow-events`.
- **Place in the right section**: find the `# ── … ──` header and add below it; create a new section if none fits.
