#!/usr/bin/env bash
# Run a deploy in a detached tmux session.
# Usage: deploy-tmux.sh staging|prod

set -euo pipefail

ENV="${1:-}"
if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  echo "Usage: deploy-tmux.sh staging|prod"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="${SCRIPT_DIR}/deploy.sh"

case "$ENV" in
  staging)
    SESSION="staging-deploy"
    LABEL="Staging"
    ;;
  prod)
    SESSION="prod-deploy"
    LABEL="Production"
    ;;
esac

if [[ ! -f "$DEPLOY_SCRIPT" ]]; then
  echo "Deploy script not found: $DEPLOY_SCRIPT"
  exit 1
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
  if pgrep -af "deploy.sh $ENV" | grep -v pgrep >/dev/null 2>&1; then
    echo "$LABEL deploy already in progress."
    echo "Attach: tmux attach -t $SESSION"
    exit 1
  fi
  tmux kill-session -t "$SESSION"
fi

tmux new-session -d -s "$SESSION" \
  "bash -lc 'set -o pipefail; bash \"$DEPLOY_SCRIPT\" \"$ENV\"; echo; echo \"Done. Detach with Ctrl-b d\"; exec bash'"

echo "$LABEL deploy started in tmux session '$SESSION'"
echo "  Watch:   tmux attach -t $SESSION"
echo "  Detach:  Ctrl-b then d (you can close this terminal safely)"
