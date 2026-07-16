#!/usr/bin/env bash
# Deploy shahlo.blog to the VPS.
#
# The live site is served by Caddy from /srv/blog on the server — it is NOT
# GitHub Pages. A `git push` updates GitHub but does nothing to the live site
# on its own. This script does the two remaining steps, both on the server:
#   1. pull the latest commit into the server's clone (/root/blog/blog)
#   2. copy the files into Caddy's docroot (/srv/blog)
#
# The copy uses rsync WITHOUT --delete, so any extra files already in
# /srv/blog (backups, credentials, etc.) are left untouched. Subfolders like
# posts/, translations/, and img/ are synced automatically.
#
# Usage:  ./deploy.sh          (run from your machine after pushing to GitHub)
set -euo pipefail

SERVER=root@89.39.94.118
CLONE=/root/blog/blog
DOCROOT=/srv/blog

ssh "$SERVER" "
  set -e
  git -C '$CLONE' pull --ff-only
  rsync -a --exclude='.git' '$CLONE'/ '$DOCROOT'/
"

echo "deployed → https://shahlo.blog"
