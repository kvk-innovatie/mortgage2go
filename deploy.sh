#!/usr/bin/env bash
#
# Build the image here, ship it to the server over ssh, and restart it there.
#
# No registry involved: `docker save` streams the image straight into
# `docker load` on the far side. Fine for an image this size; if it grows, a
# registry push is the faster route.
#
# Everything is overridable from the environment:
#   DEPLOY_HOST=staging.example.org ./deploy.sh

set -euo pipefail

HOST="${DEPLOY_HOST:-mortgage2go.mayersoftwaredevelopment.nl}"
USER="${DEPLOY_USER:-root}"
SSH_KEY="${DEPLOY_SSH_KEY:-$HOME/.ssh/id_ed25519}"
REMOTE_DIR="${DEPLOY_DIR:-/root/mortgage2go}"
IMAGE="${DEPLOY_IMAGE:-mortgage2go}"
TAG="${DEPLOY_TAG:-latest}"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$REPO_DIR/server/.env"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()  { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# --- checks -----------------------------------------------------------------

[ -f "$SSH_KEY" ] || fail "SSH key $SSH_KEY not found. Set DEPLOY_SSH_KEY."
[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found. Copy server/.env.example to it and fill in the API key."

grep -q '^WALLET_CONNECT_API_KEY=.\+' "$ENV_FILE" \
  || fail "WALLET_CONNECT_API_KEY is empty in $ENV_FILE — the container would refuse to start."

SSH="ssh -i $SSH_KEY $USER@$HOST"

info "Deploying to $USER@$HOST:$REMOTE_DIR"

# --- 1. build ---------------------------------------------------------------

# The VITE_* build arg is read from docker-compose.yml so the two cannot drift.
SERVICE_ID="$(sed -n 's/^ *VITE_SERVICE_ID: *//p' "$REPO_DIR/docker-compose.yml" | head -1)"
SERVICE_ID="${SERVICE_ID:-EH_A530D4346A7ACD00}"

info "Building $IMAGE:$TAG (VITE_SERVICE_ID=$SERVICE_ID)"
docker build \
  --build-arg "VITE_SERVICE_ID=$SERVICE_ID" \
  -t "$IMAGE:$TAG" \
  "$REPO_DIR"

# --- 2. ship the image ------------------------------------------------------

info "Uploading image (this is the slow part)"
docker save "$IMAGE:$TAG" | gzip | $SSH 'gunzip | docker load'

# --- 3. ship the compose file and the secret --------------------------------

info "Copying docker-compose.yml and server/.env"
$SSH "mkdir -p $REMOTE_DIR/server"
scp -i "$SSH_KEY" "$REPO_DIR/docker-compose.yml" "$USER@$HOST:$REMOTE_DIR/docker-compose.yml"
# docker-compose.yml reads the API key through `env_file: server/.env`, so the
# file has to land at that same relative path on the server.
scp -i "$SSH_KEY" "$ENV_FILE" "$USER@$HOST:$REMOTE_DIR/server/.env"
$SSH "chmod 600 $REMOTE_DIR/server/.env"

# --- 4. restart -------------------------------------------------------------

# --no-build because the Dockerfile is not on the server; the image just landed.
# --force-recreate because the tag is unchanged, so Compose would otherwise see
# the running container as already up to date and leave the old image running.
info "Restarting the container"
$SSH "cd $REMOTE_DIR && docker compose up -d --no-build --force-recreate"

info "Deployed. Checking health…"
sleep 3
if $SSH "curl -fsS http://localhost:7020/healthz"; then
  echo
  info "Up at https://$HOST (container port 7020)"
else
  echo
  warn "Health check did not answer yet. Logs:"
  $SSH "cd $REMOTE_DIR && docker compose logs --tail 30"
fi
