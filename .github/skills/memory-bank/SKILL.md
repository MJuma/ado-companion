---
name: memory-bank
description: Query, add to, or maintain the ADO Companion memory bank of gotchas, decisions, issues, and patterns
---

# Memory Bank

The memory bank at `.github/memory-bank.md` is a shared, grep-searchable knowledge base. Use it to avoid repeating past mistakes and to preserve discoveries for future agents.

## Querying

Search by tag:
```bash
grep '\[gotcha\]' .github/memory-bank.md
grep '\[decision\]' .github/memory-bank.md
grep '\[issue\]' .github/memory-bank.md
grep '\[perf\]' .github/memory-bank.md
grep '\[pattern\]' .github/memory-bank.md
grep '\[data\]' .github/memory-bank.md
```

Search by topic:
```bash
grep -i 'wxt' .github/memory-bank.md
grep -i 'fluent' .github/memory-bank.md
grep -i 'solid' .github/memory-bank.md
grep -i 'release' .github/memory-bank.md
```

Combine tag + topic:
```bash
grep '\[gotcha\].*shadow' .github/memory-bank.md
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

### Example

```bash
# Append to the WXT section:
echo '[gotcha] zip-output: wxt zip writes to packages/extension/.output/, not the repo root.' >> .github/memory-bank.md
```

Or use the edit tool to place it in the right section.

## Removing Entries

Remove entries that are no longer true (e.g. a bug was fixed). Use the edit tool to delete the line. Note non-obvious removals:

```
# Removed: [gotcha] old-thing — fixed in <commit>
```

## When to Use

- **Before starting any task**: search for your topic area. 5 seconds of grep can save 30 minutes.
- **When you hit surprising behavior**: add it immediately, not at the end of the session.
- **When you fix a bug**: document the root cause as an `[issue]`.
- **When you make a design choice**: document the reasoning as a `[decision]`.
