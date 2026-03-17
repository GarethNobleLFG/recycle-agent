#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-5000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
DISPLAY_BACKEND_HOST="${DISPLAY_BACKEND_HOST:-localhost}"
DISPLAY_FRONTEND_HOST="${DISPLAY_FRONTEND_HOST:-localhost}"

backend_pid=""
frontend_pid=""

if [[ -t 1 ]]; then
  COLOR_RESET=$'\033[0m'
  COLOR_BLUE=$'\033[34m'
  COLOR_GREEN=$'\033[32m'
  COLOR_YELLOW=$'\033[33m'
  COLOR_RED=$'\033[31m'
else
  COLOR_RESET=""
  COLOR_BLUE=""
  COLOR_GREEN=""
  COLOR_YELLOW=""
  COLOR_RED=""
fi

print_info() {
  echo "${COLOR_BLUE}==>${COLOR_RESET} $*"
}

print_success() {
  echo "${COLOR_GREEN}==>${COLOR_RESET} $*"
}

print_warn() {
  echo "${COLOR_YELLOW}==>${COLOR_RESET} $*"
}

print_error() {
  echo "${COLOR_RED}==>${COLOR_RESET} $*" >&2
}

cleanup() {
  local exit_code=$?

  if [[ -n "${frontend_pid}" ]] && kill -0 "${frontend_pid}" 2>/dev/null; then
    kill "${frontend_pid}" 2>/dev/null || true
  fi

  if [[ -n "${backend_pid}" ]] && kill -0 "${backend_pid}" 2>/dev/null; then
    kill "${backend_pid}" 2>/dev/null || true
  fi

  wait "${frontend_pid:-}" "${backend_pid:-}" 2>/dev/null || true
  exit "${exit_code}"
}

trap cleanup EXIT INT TERM

require_cmd() {
  local cmd="$1"

  if ! command -v "${cmd}" >/dev/null 2>&1; then
    print_error "Missing required command: ${cmd}"
    exit 1
  fi
}

frontend_deps_installed() {
  [[ -d "$FRONTEND_DIR/node_modules" ]]
}

backend_deps_installed() {
  "$PYTHON_BIN" - <<'PY'
import sys

try:
    from importlib import metadata
except ImportError:
    import importlib_metadata as metadata

required = {
    "fastapi": "0.104.1",
    "uvicorn": "0.24.0",
    "python-dotenv": "1.0.0",
    "python-multipart": "0.0.6",
}

for package, expected_version in required.items():
    try:
        installed_version = metadata.version(package)
    except metadata.PackageNotFoundError:
        sys.exit(1)

    if installed_version != expected_version:
        sys.exit(1)
PY
}

detect_python() {
  local candidates=(
    "$ROOT_DIR/.venv/bin/python"
    "$ROOT_DIR/venv/bin/python"
    "$BACKEND_DIR/.venv/bin/python"
    "$BACKEND_DIR/venv/bin/python"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "${candidate}" ]]; then
      echo "${candidate}"
      return 0
    fi
  done

  if command -v python3 >/dev/null 2>&1; then
    command -v python3
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    command -v python
    return 0
  fi

  print_error "Missing required command: python3 (or an activated project virtualenv)"
  exit 1
}

require_cmd npm
PYTHON_BIN="$(detect_python)"

if ! frontend_deps_installed; then
  print_info "Installing frontend dependencies..."
  (
    cd "$FRONTEND_DIR"
    npm install --silent --no-fund --no-audit
  ) >/dev/null 2>&1
  print_success "Frontend dependencies ready."
fi

if ! backend_deps_installed; then
  print_info "Installing backend dependencies..."
  (
    cd "$BACKEND_DIR"
    "$PYTHON_BIN" -m pip install --quiet -r requirements.txt
  ) >/dev/null 2>&1
  print_success "Backend dependencies ready."
fi

(
  cd "$BACKEND_DIR"
  exec "$PYTHON_BIN" -m uvicorn main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT" --reload
) &
backend_pid=$!

(
  cd "$FRONTEND_DIR"
  exec npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"
) &
frontend_pid=$!

print_success "Frontend: http://${DISPLAY_FRONTEND_HOST}:${FRONTEND_PORT}"
print_success "Backend:  http://${DISPLAY_BACKEND_HOST}:${BACKEND_PORT}"

while true; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    wait "$backend_pid" 2>/dev/null || true
    exit 1
  fi

  if ! kill -0 "$frontend_pid" 2>/dev/null; then
    wait "$frontend_pid" 2>/dev/null || true
    exit 1
  fi

  sleep 1
done
