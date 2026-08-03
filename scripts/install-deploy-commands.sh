#!/usr/bin/env bash
# Installs deploy-staging and deploy-prod shortcuts on the VPS (~/.local/bin).
# Run on the server: bash scripts/install-deploy-commands.sh

set -euo pipefail

BIN_DIR="${HOME}/.local/bin"
PROD_DIR="${PROD_DIR:-${HOME}/new-store}"
TMUX_SCRIPT="${PROD_DIR}/scripts/deploy-tmux.sh"

mkdir -p "$BIN_DIR"

if [[ ! -f "$TMUX_SCRIPT" ]]; then
  echo "Expected deploy scripts in: $PROD_DIR/scripts/"
  echo "Pull the latest code in $PROD_DIR first."
  exit 1
fi

install_command() {
  local name="$1"
  local env="$2"
  local bin_path="${BIN_DIR}/${name}"

  cat > "$bin_path" <<EOF
#!/usr/bin/env bash
exec "${TMUX_SCRIPT}" ${env}
EOF
  chmod +x "$bin_path"
  echo "Installed: $bin_path"
}

install_command "deploy-staging" "staging"
install_command "deploy-prod" "prod"

# Remove legacy single deploy command if present
rm -f "${BIN_DIR}/deploy"

chmod +x "${PROD_DIR}/scripts/deploy.sh" \
  "${PROD_DIR}/scripts/deploy-tmux.sh" \
  "${PROD_DIR}/scripts/deploy-staging.sh" \
  "${PROD_DIR}/scripts/deploy-prod.sh" 2>/dev/null || true

BASHRC="${HOME}/.bashrc"
MARKER="# abundish deploy shortcuts"
if ! grep -q "$MARKER" "$BASHRC" 2>/dev/null; then
  cat >> "$BASHRC" <<'BASHRC'

# abundish deploy shortcuts
if [ -d "$HOME/.local/bin" ]; then
  export PATH="$HOME/.local/bin:$PATH"
fi
BASHRC
fi

if grep -q 'alias deploy=' "$BASHRC" 2>/dev/null; then
  sed -i '/alias deploy=/d' "$BASHRC"
fi

echo ""
echo "Commands:"
echo "  deploy-staging  — pull, rebuild, and start staging (tmux: staging-deploy)"
echo "  deploy-prod     — pull, rebuild, and start production (tmux: prod-deploy)"
echo ""
echo "Optional: DEPLOY_NO_CACHE=1 deploy-staging  (full rebuild without cache)"
