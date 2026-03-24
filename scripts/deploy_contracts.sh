#!/bin/bash

# 合约部署脚本（存储分离架构）
# Storage 合约只部署一次，逻辑合约可随时升级替换
#
# 首次完整部署:  bash deploy_contracts.sh
# 仅升级逻辑合约: bash deploy_contracts.sh --upgrade

set -e

CONSOLE_DIR="/Users/hqsk/Work/fisco/console"
DEPLOYMENT_INFO="$CONSOLE_DIR/deployment_info.json"
DEPLOYMENT_LOG="$CONSOLE_DIR/deployment.log"
UPGRADE_MODE=false

if [[ "$1" == "--upgrade" ]]; then
    UPGRADE_MODE=true
fi

log() { echo "$1" | tee -a "$DEPLOYMENT_LOG"; }

log "=== 开始部署合约 ==="
log "部署时间: $(date)"
log "模式: $( $UPGRADE_MODE && echo '升级逻辑合约' || echo '首次完整部署' )"

cd "$CONSOLE_DIR"

if [ ! -f "start.sh" ]; then
    echo "错误: 未找到 FISCO BCOS 控制台，请先安装到 $CONSOLE_DIR"
    exit 1
fi

# ============================================================
# 升级模式：读取已有 Storage 地址，只重新部署逻辑合约
# ============================================================
if $UPGRADE_MODE; then
    if [ ! -f "$DEPLOYMENT_INFO" ]; then
        echo "错误: 未找到 deployment_info.json，升级模式需要已有部署信息"
        exit 1
    fi

    echo ""
    echo "=== 升级模式：读取现有 Storage 地址 ==="
    ACCOUNT_STORAGE_ADDR=$(python3 -c "import json,sys; d=json.load(open('$DEPLOYMENT_INFO')); print(d['storage']['AccountStorage'])")
    FIAT_STORAGE_ADDR=$(python3    -c "import json,sys; d=json.load(open('$DEPLOYMENT_INFO')); print(d['storage']['FiatStorage'])")
    TICKET_STORAGE_ADDR=$(python3  -c "import json,sys; d=json.load(open('$DEPLOYMENT_INFO')); print(d['storage']['TicketStorage'])")
    AUTH_ADDR=$(python3            -c "import json,sys; d=json.load(open('$DEPLOYMENT_INFO')); print(d['contracts']['Auth'])")
    FEE_COLLECTOR_ADDR=$(python3   -c "import json,sys; d=json.load(open('$DEPLOYMENT_INFO')); print(d['meta']['feeCollector'])")

    echo "AccountStorage : $ACCOUNT_STORAGE_ADDR"
    echo "FiatStorage    : $FIAT_STORAGE_ADDR"
    echo "TicketStorage  : $TICKET_STORAGE_ADDR"
    echo "Auth           : $AUTH_ADDR"
    echo "FeeCollector   : $FEE_COLLECTOR_ADDR"
    echo ""
    read -p "确认以上地址正确，继续升级？(y/N) " CONFIRM
    [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]] && echo "已取消" && exit 0

    # 启动控制台执行升级
    bash start.sh << UPGRADE_EOF
# ---- 重新部署逻辑合约 ----
echo "=== 部署新 Account ==="
deploy Account $AUTH_ADDR $ACCOUNT_STORAGE_ADDR
getDeployLog Account 1

echo "请输入新 Account 合约地址:"
read NEW_ACCOUNT_ADDR

echo "=== 部署新 FiatToken ==="
deploy FiatToken $AUTH_ADDR $NEW_ACCOUNT_ADDR $FIAT_STORAGE_ADDR
getDeployLog FiatToken 1

echo "请输入新 FiatToken 合约地址:"
read NEW_FIATTOKEN_ADDR

echo "=== 部署新 Ticket ==="
deploy Ticket $AUTH_ADDR $NEW_ACCOUNT_ADDR $TICKET_STORAGE_ADDR
getDeployLog Ticket 1

echo "请输入新 Ticket 合约地址:"
read NEW_TICKET_ADDR

echo "=== 部署新 Exchange ==="
deploy Exchange $AUTH_ADDR $NEW_ACCOUNT_ADDR $NEW_FIATTOKEN_ADDR $NEW_TICKET_ADDR $FEE_COLLECTOR_ADDR
getDeployLog Exchange 1

echo "请输入新 Exchange 合约地址:"
read NEW_EXCHANGE_ADDR

# ---- 绑定新逻辑合约到 Storage ----
echo "=== 绑定 AccountStorage -> 新 Account ==="
call AccountStorage $ACCOUNT_STORAGE_ADDR setLogicContract $NEW_ACCOUNT_ADDR

echo "=== 绑定 FiatStorage -> 新 FiatToken ==="
call FiatStorage $FIAT_STORAGE_ADDR setLogicContract $NEW_FIATTOKEN_ADDR

echo "=== 绑定 TicketStorage -> 新 Ticket ==="
call TicketStorage $TICKET_STORAGE_ADDR setLogicContract $NEW_TICKET_ADDR

echo "=== 设置 FiatToken.exchangeContract ==="
call FiatToken $NEW_FIATTOKEN_ADDR setExchangeContract $NEW_EXCHANGE_ADDR

echo ""
echo "升级完成！请手动更新 deployment_info.json 中的逻辑合约地址："
echo "  Account  : $NEW_ACCOUNT_ADDR"
echo "  FiatToken: $NEW_FIATTOKEN_ADDR"
echo "  Ticket   : $NEW_TICKET_ADDR"
echo "  Exchange : $NEW_EXCHANGE_ADDR"

exit
UPGRADE_EOF

    log "=== 升级流程结束 ==="
    exit 0
fi

# ============================================================
# 首次完整部署
# ============================================================

echo ""
echo "请输入手续费收集地址（部署后不可更改 Storage，请确认）:"
read -p "FeeCollector 地址: " FEE_COLLECTOR_ADDR

bash start.sh << DEPLOY_EOF
# ---- Step 1: Storage 合约（只部署一次，永不重新部署）----
echo "=== [1/8] 部署 Auth ==="
deploy Auth
getDeployLog Auth 1
echo "请输入 Auth 合约地址:"; read AUTH_ADDR

echo "=== [2/8] 部署 AccountStorage ==="
deploy AccountStorage
getDeployLog AccountStorage 1
echo "请输入 AccountStorage 合约地址:"; read ACCOUNT_STORAGE_ADDR

echo "=== [3/8] 部署 FiatStorage ==="
deploy FiatStorage
getDeployLog FiatStorage 1
echo "请输入 FiatStorage 合约地址:"; read FIAT_STORAGE_ADDR

echo "=== [4/8] 部署 TicketStorage ==="
deploy TicketStorage
getDeployLog TicketStorage 1
echo "请输入 TicketStorage 合约地址:"; read TICKET_STORAGE_ADDR

# ---- Step 2: 逻辑合约 ----
echo "=== [5/8] 部署 Account ==="
deploy Account $AUTH_ADDR $ACCOUNT_STORAGE_ADDR
getDeployLog Account 1
echo "请输入 Account 合约地址:"; read ACCOUNT_ADDR

echo "=== [6/8] 部署 FiatToken ==="
deploy FiatToken $AUTH_ADDR $ACCOUNT_ADDR $FIAT_STORAGE_ADDR
getDeployLog FiatToken 1
echo "请输入 FiatToken 合约地址:"; read FIATTOKEN_ADDR

echo "=== [7/8] 部署 Ticket ==="
deploy Ticket $AUTH_ADDR $ACCOUNT_ADDR $TICKET_STORAGE_ADDR
getDeployLog Ticket 1
echo "请输入 Ticket 合约地址:"; read TICKET_ADDR

echo "=== [8/8] 部署 Exchange ==="
deploy Exchange $AUTH_ADDR $ACCOUNT_ADDR $FIATTOKEN_ADDR $TICKET_ADDR $FEE_COLLECTOR_ADDR
getDeployLog Exchange 1
echo "请输入 Exchange 合约地址:"; read EXCHANGE_ADDR

# ---- Step 3: 初始化绑定 ----
echo "=== 绑定 Storage -> 逻辑合约 ==="
call AccountStorage $ACCOUNT_STORAGE_ADDR setLogicContract $ACCOUNT_ADDR
call FiatStorage    $FIAT_STORAGE_ADDR    setLogicContract $FIATTOKEN_ADDR
call TicketStorage  $TICKET_STORAGE_ADDR  setLogicContract $TICKET_ADDR

echo "=== 设置 FiatToken.exchangeContract ==="
call FiatToken $FIATTOKEN_ADDR setExchangeContract $EXCHANGE_ADDR

echo "=== 设置 Auth.accountContract ==="
call Auth $AUTH_ADDR setAccountContract $ACCOUNT_ADDR

# ---- Step 4: 保存部署信息 ----
echo "=== 保存 deployment_info.json ==="
cat > deployment_info.json << JSON
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "network": "dev",
  "meta": {
    "feeCollector": "$FEE_COLLECTOR_ADDR"
  },
  "storage": {
    "AccountStorage": "$ACCOUNT_STORAGE_ADDR",
    "FiatStorage":    "$FIAT_STORAGE_ADDR",
    "TicketStorage":  "$TICKET_STORAGE_ADDR"
  },
  "contracts": {
    "Auth":     "$AUTH_ADDR",
    "Account":  "$ACCOUNT_ADDR",
    "FiatToken":"$FIATTOKEN_ADDR",
    "Ticket":   "$TICKET_ADDR",
    "Exchange": "$EXCHANGE_ADDR"
  }
}
JSON

echo ""
echo "=== 部署完成 ==="
cat deployment_info.json

exit
DEPLOY_EOF

log "=== 部署流程结束 ==="

if [ -f "$DEPLOYMENT_INFO" ]; then
    log "部署信息:"
    cat "$DEPLOYMENT_INFO" | tee -a "$DEPLOYMENT_LOG"
else
    log "警告: 未找到 deployment_info.json，请检查控制台输出"
fi
