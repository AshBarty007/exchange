#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PYTHON_BIN="${PROJECT_ROOT}/py_env/bin/python"

USER_PORT=5001
ASSET_PORT=5002
MATCHING_PORT=8081
BLOCKCHAIN_PORT=8082
SETTLEMENT_PORT=8083
FRONTEND_PORT=3000

usage() {
  cat <<'EOF'
Usage:
  ./scripts/service_ctl.sh start [all|user|asset|blockchain|settlement|matching|frontend]
  ./scripts/service_ctl.sh stop [all|user|asset|blockchain|settlement|matching|frontend]
  ./scripts/service_ctl.sh restart [all|user|asset|blockchain|settlement|matching|frontend]
  ./scripts/service_ctl.sh status

Commands:
  start    Stop occupied port first, then start target service(s) in background.
  stop     Stop target service(s) by port.
  restart  stop + start for target service(s).
  status   Show listener status and key blockchain status.
EOF
}

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -z "${pids}" ]]; then
    return 0
  fi

  echo "${pids}" | tr ' ' '\n' | while IFS= read -r pid; do
    [[ -n "${pid}" ]] && kill "${pid}" 2>/dev/null || true
  done
  sleep 1
}

start_user() {
  kill_port "${USER_PORT}"
  cd "${PROJECT_ROOT}/python-services/user-service"
  nohup "${PYTHON_BIN}" app.py > /tmp/user-service.log 2>&1 < /dev/null &
  echo "user-service   pid=$!  port=${USER_PORT}"
}

start_asset() {
  kill_port "${ASSET_PORT}"
  cd "${PROJECT_ROOT}/python-services/asset-service"
  nohup "${PYTHON_BIN}" app.py > /tmp/asset-service.log 2>&1 < /dev/null &
  echo "asset-service  pid=$!  port=${ASSET_PORT}"
}

start_matching() {
  kill_port "${MATCHING_PORT}"
  cd "${PROJECT_ROOT}/java-services/matching-engine"
  nohup mvn -q spring-boot:run > /tmp/matching-engine.log 2>&1 < /dev/null &
  echo "matching-engine pid=$! port=${MATCHING_PORT}"
}

start_blockchain() {
  kill_port "${BLOCKCHAIN_PORT}"
  cd "${PROJECT_ROOT}/java-services/blockchain-service"
  nohup mvn -q spring-boot:run > /tmp/blockchain-service.log 2>&1 < /dev/null &
  echo "blockchain-service pid=$! port=${BLOCKCHAIN_PORT}"
}

start_settlement() {
  kill_port "${SETTLEMENT_PORT}"
  cd "${PROJECT_ROOT}/java-services/settlement-service"
  nohup mvn -q spring-boot:run > /tmp/settlement-service.log 2>&1 < /dev/null &
  echo "settlement-service pid=$! port=${SETTLEMENT_PORT}"
}

start_frontend() {
  kill_port "${FRONTEND_PORT}"
  cd "${PROJECT_ROOT}/frontend"
  if [[ ! -d node_modules ]]; then
    npm install --legacy-peer-deps
  fi
  nohup npm run dev > /tmp/frontend.log 2>&1 < /dev/null &
  echo "frontend       pid=$!  port=${FRONTEND_PORT}"
}

start_all() {
  echo "Starting services..."
  start_user
  start_asset
  start_blockchain
  start_settlement
  start_matching
  start_frontend
  echo "Done. Logs under /tmp/*-service.log and /tmp/frontend.log"
}

stop_user() {
  kill_port "${USER_PORT}"
  echo "user-service   stopped (port=${USER_PORT})"
}

stop_asset() {
  kill_port "${ASSET_PORT}"
  echo "asset-service  stopped (port=${ASSET_PORT})"
}

stop_matching() {
  kill_port "${MATCHING_PORT}"
  echo "matching-engine stopped (port=${MATCHING_PORT})"
}

stop_blockchain() {
  kill_port "${BLOCKCHAIN_PORT}"
  echo "blockchain-service stopped (port=${BLOCKCHAIN_PORT})"
}

stop_settlement() {
  kill_port "${SETTLEMENT_PORT}"
  echo "settlement-service stopped (port=${SETTLEMENT_PORT})"
}

stop_frontend() {
  kill_port "${FRONTEND_PORT}"
  echo "frontend       stopped (port=${FRONTEND_PORT})"
}

stop_all() {
  echo "Stopping services by port..."
  stop_frontend
  stop_user
  stop_asset
  stop_matching
  stop_blockchain
  stop_settlement
  echo "Done."
}

status_all() {
  echo "Listening ports:"
  lsof -iTCP -sTCP:LISTEN -nP | rg ":${FRONTEND_PORT}|:${USER_PORT}|:${ASSET_PORT}|:${MATCHING_PORT}|:${BLOCKCHAIN_PORT}|:${SETTLEMENT_PORT}" || true
  echo
  echo "Blockchain status:"
  curl -sS "http://127.0.0.1:${BLOCKCHAIN_PORT}/api/blockchain/status" || true
  echo
}

main() {
  if [[ $# -lt 1 || $# -gt 2 ]]; then
    usage
    exit 1
  fi

  local action="$1"
  local target="${2:-all}"

  if [[ "${action}" == "status" ]]; then
    status_all
    exit 0
  fi

  run_start() {
    case "${target}" in
      all) start_all ;;
      user) start_user ;;
      asset) start_asset ;;
      blockchain) start_blockchain ;;
      settlement) start_settlement ;;
      matching) start_matching ;;
      frontend) start_frontend ;;
      *) usage; exit 1 ;;
    esac
  }

  run_stop() {
    case "${target}" in
      all) stop_all ;;
      user) stop_user ;;
      asset) stop_asset ;;
      blockchain) stop_blockchain ;;
      settlement) stop_settlement ;;
      matching) stop_matching ;;
      frontend) stop_frontend ;;
      *) usage; exit 1 ;;
    esac
  }

  case "${action}" in
    start) run_start ;;
    stop) run_stop ;;
    restart)
      run_stop
      run_start
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
