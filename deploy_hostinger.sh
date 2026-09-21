#!/usr/bin/env bash
# =============================================================================
# Tetra Aeromech — Deploy to Hostinger via GitHub
# Usage: ./deploy_hostinger.sh <GITHUB_PAT>
# =============================================================================
set -e

GITHUB_PAT="${1:-}"
GITHUB_USER="nq01has"
GITHUB_REPO="Tetra-Aeromech"
REMOTE_URL="https://${GITHUB_USER}:${GITHUB_PAT}@github.com/${GITHUB_USER}/${GITHUB_REPO}.git"

SSH_HOST="86.38.243.155"
SSH_PORT="65002"
SSH_USER="u408450631"
SSH_PASS="Nikhil@1122Z"
REMOTE_PATH="/home/u408450631/domains/ifleon.com/public_html/tetra-aeromech"

if [ -z "$GITHUB_PAT" ]; then
  echo "❌  Usage: ./deploy_hostinger.sh <GITHUB_PAT>"
  exit 1
fi

echo "📦  Step 1: Pushing to GitHub..."
git remote set-url origin "$REMOTE_URL"
git push -u origin main
git remote set-url origin "https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"  # strip token from remote
echo "✅  GitHub push complete."

echo ""
echo "🚀  Step 2: Deploying to Hostinger via SSH..."
echo "    SSH: ${SSH_USER}@${SSH_HOST}:${SSH_PORT}"
echo ""
echo "    Run these commands manually on Hostinger SSH:"
echo "    ──────────────────────────────────────────────"
echo "    cd ${REMOTE_PATH}"
echo "    git init"
echo "    git remote add origin https://github.com/${GITHUB_USER}/${GITHUB_REPO}.git"
echo "    git pull origin main"
echo "    # OR if directory already has files:"
echo "    git fetch origin main && git reset --hard origin/main"
echo "    ──────────────────────────────────────────────"
echo ""
echo "    SSH connect command:"
echo "    ssh -p ${SSH_PORT} ${SSH_USER}@${SSH_HOST}"
echo ""
echo "✅  Done! Visit: http://tetra-aeromech.ifleon.com"
