---
name: publish-to-github
description: 'Publish this repository to GitHub (https://github.com/imashmit/har-visualizer). Use whenever the user asks to publish, push, ship, sync, or upload the repo/changes to GitHub, or says "publish this", "push to GitHub", "push my changes", or "publish to the repo". Stages changes, commits, and pushes the current branch to the origin remote.'
argument-hint: 'optional commit message'
---

# Publish to GitHub

Publishes the HAR Visualizer repository to its GitHub remote:
`https://github.com/imashmit/har-visualizer.git` (remote `origin`, default branch `main`).

## When to Use

- "Publish this repo" / "publish my changes"
- "Push to GitHub" / "push this" / "ship it"
- "Sync to GitHub" / "upload the latest"

## Before You Start

- Build artifacts (`node_modules/`, `dist/`) are already excluded via `.gitignore`. Do not commit them.
- Never use `git push --force` or `git reset --hard` unless the user explicitly asks. Pushing rewrites shared history.
- If the user supplies a commit message argument, use it verbatim. Otherwise generate a concise, descriptive message summarizing the actual changes.

## Procedure

1. **Inspect state** — confirm the repo, branch, and what will be published:
   ```bash
   git status
   git remote -v
   git branch --show-current
   ```
   - If there is no `origin` remote, add it:
     ```bash
     git remote add origin https://github.com/imashmit/har-visualizer.git
     ```
   - If `origin` points elsewhere, stop and ask the user before changing it.

2. **Guard against artifacts** — make sure no ignored build output is staged:
   ```bash
   git ls-files | grep -E "node_modules|dist/" || echo "clean"
   ```
   If anything matches, stop and fix `.gitignore` / unstage before continuing.

3. **Stage and commit** (skip if the working tree is already clean):
   ```bash
   git add -A
   git commit -m "<message>"
   ```
   Use the user-provided message, or generate one from the diff (e.g. `git --no-pager diff --staged --stat`).

4. **Push** the current branch and set upstream on first publish:
   ```bash
   git push -u origin main
   ```

5. **Confirm** — report the pushed branch, commit hash, and the repo URL
   (https://github.com/imashmit/har-visualizer) back to the user.

## Notes

- If authentication is required, the terminal handles the browser/login flow — do not enter credentials on the user's behalf.
- If the push is rejected because the remote is ahead, run `git pull --rebase origin main`, resolve any conflicts, then push again. Never force-push to resolve this without explicit user approval.
