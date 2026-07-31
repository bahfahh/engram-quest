# Obsidian CLI Reference

## What it is

Obsidian CLI is the **official** Obsidian command line interface (v1.12+).
It uses Obsidian's built-in index — the same index the GUI uses.
Results are fast, accurate, and support full Obsidian search syntax.

**Requirement**: Obsidian app must be running. Enable via Settings → General → Enable Command line interface.

## Search syntax

```bash
# Full-text search
obsidian search query="keyword"

# Tag search
obsidian search query="tag:#flashcards/azure" limit=20

# Path filter
obsidian search query="path:Study keyword"

# JSON output (use this for programmatic processing)
obsidian search query="keyword" format=json

# Target a specific vault
obsidian vault="Obsidian_Note" search query="keyword"
```

## Query operators

```
keyword                  full-text
tag:#flashcards/azure    tag search
path:Study               path filter
file:azure               filename filter
"exact phrase"           exact match
kw1 kw2                  AND (space)
kw1 OR kw2               OR
```

## Read / write notes

```bash
obsidian read path="folder/note.md"
obsidian read file="Note Name"
obsidian create name="New Note" content="# Hello" silent
obsidian append file="My Note" content="new line"
obsidian property:set name="status" value="done" file="My Note"
```

## Known silent failures (v1.12)

| Wrong | Problem | Correct |
|---|---|---|
| `tasks todo` | scoped to active file only, returns empty | `tasks all todo` |
| `tags counts` | returns empty | `tags all counts` |
| `create name="x" content="y"` | opens GUI | add `silent` flag |

## Fallback when CLI is unavailable

If `obsidian search` fails (CLI not installed or Obsidian not running), fall back to:

```bash
bash scripts/search_vault.sh "<topic>" 30
```

`search_vault.sh` is grep-based — slower, no index, no Obsidian syntax. Use only as fallback for note discovery, or for L2 hint personal context search (its only other permitted use).
