#!/usr/bin/env bash
# Build and publish to the gh-pages branch, which GitHub auto-serves at
# https://devops-tatvacare.github.io/liver-forever-dashboard/
#
# Uses the "legacy" (branch-source) Pages mode, so the token only needs the
# `repo` scope — no `workflow` scope required.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REMOTE_URL="$(git config --get remote.origin.url)"
BRANCH="gh-pages"
WT="$(mktemp -d -t lfd-gh-pages-XXXXXX)"

echo "→ Building with Pages base path…"
BASE_PATH=/liver-forever-dashboard/ npm run build

echo "→ Syncing gh-pages worktree…"
# Fetch remote branch if it exists; fall back to orphan.
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git fetch origin "$BRANCH" --depth=1
  git worktree add "$WT" "origin/$BRANCH"
  (cd "$WT" && git switch -C "$BRANCH")
else
  git worktree add --orphan -b "$BRANCH" "$WT"
fi

echo "→ Copying dist → $WT"
rm -rf "$WT"/*
cp -R dist/* "$WT/"
touch "$WT/.nojekyll"

echo "→ Committing…"
cd "$WT"
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  git commit -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git push origin "$BRANCH"
fi

cd "$ROOT"
git worktree remove --force "$WT" >/dev/null

echo "✓ Deployed. Live at https://devops-tatvacare.github.io/liver-forever-dashboard/"
