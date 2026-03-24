#!/bin/bash

# 合约地址更新脚本
# 用途: 部署合约后自动更新配置文件中的合约地址

set -e

PROJECT_ROOT="/Users/hqsk/Work/kxdex/kxdex"
CONSOLE_DIR="/Users/hqsk/Work/kxnode/console"
DEPLOYMENT_INFO="$CONSOLE_DIR/deployment_info.json"

echo "=== 更新合约地址 ==="

# 检查部署信息文件
if [ ! -f "$DEPLOYMENT_INFO" ]; then
    echo "错误: 未找到部署信息文件 $DEPLOYMENT_INFO"
    echo "请先部署合约"
    exit 1
fi

# 检查 jq 命令
if ! command -v jq &> /dev/null; then
    echo "错误: 需要安装 jq 命令"
    exit 1
fi

# 读取合约地址
AUTH_ADDR=$(jq -r '.contracts.Auth' "$DEPLOYMENT_INFO")
ACCOUNT_ADDR=$(jq -r '.contracts.Account' "$DEPLOYMENT_INFO")
FIATTOKEN_ADDR=$(jq -r '.contracts.FiatToken' "$DEPLOYMENT_INFO")
TICKET_ADDR=$(jq -r '.contracts.Ticket' "$DEPLOYMENT_INFO")
EXCHANGE_ADDR=$(jq -r '.contracts.Exchange' "$DEPLOYMENT_INFO")

echo "读取到的合约地址:"
echo "  Auth: $AUTH_ADDR"
echo "  Account: $ACCOUNT_ADDR"
echo "  FiatToken: $FIATTOKEN_ADDR"
echo "  Ticket: $TICKET_ADDR"
echo "  Exchange: $EXCHANGE_ADDR"
echo ""

# 更新 .env 文件
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
    echo "更新 .env 文件..."
    sed -i.bak "s/^AUTH_ADDRESS=.*/AUTH_ADDRESS=$AUTH_ADDR/" "$ENV_FILE"
    sed -i.bak "s/^ACCOUNT_ADDRESS=.*/ACCOUNT_ADDRESS=$ACCOUNT_ADDR/" "$ENV_FILE"
    sed -i.bak "s/^FIATTOKEN_ADDRESS=.*/FIATTOKEN_ADDRESS=$FIATTOKEN_ADDR/" "$ENV_FILE"
    sed -i.bak "s/^TICKET_ADDRESS=.*/TICKET_ADDRESS=$TICKET_ADDR/" "$ENV_FILE"
    sed -i.bak "s/^EXCHANGE_ADDRESS=.*/EXCHANGE_ADDRESS=$EXCHANGE_ADDR/" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
    echo "  ✅ .env 文件更新完成"
else
    echo "  ⚠️  .env 文件不存在，跳过"
fi

# 更新前端配置文件
FRONTEND_CONFIG="$PROJECT_ROOT/wallet-dapp/src/config/contracts.ts"
if [ -f "$FRONTEND_CONFIG" ]; then
    echo "更新前端配置文件..."
    cat > "$FRONTEND_CONFIG" << EOF
// 合约地址配置
// 自动生成于: $(date)

export const contracts = {
  Auth: '$AUTH_ADDR',
  Account: '$ACCOUNT_ADDR',
  FiatToken: '$FIATTOKEN_ADDR',
  Ticket: '$TICKET_ADDR',
  Exchange: '$EXCHANGE_ADDR',
};

export const networkConfig = {
  nodeUrl: '127.0.0.1:20200',
  groupId: 'group0',
};
EOF
    echo "  ✅ 前端配置文件更新完成"
else
    echo "  ⚠️  前端配置文件不存在，创建新文件"
    mkdir -p "$(dirname "$FRONTEND_CONFIG")"
    cat > "$FRONTEND_CONFIG" << EOF
// 合约地址配置
// 自动生成于: $(date)

export const contracts = {
  Auth: '$AUTH_ADDR',
  Account: '$ACCOUNT_ADDR',
  FiatToken: '$FIATTOKEN_ADDR',
  Ticket: '$TICKET_ADDR',
  Exchange: '$EXCHANGE_ADDR',
};

export const networkConfig = {
  nodeUrl: '127.0.0.1:20200',
  groupId: 'group0',
};
EOF
    echo "  ✅ 前端配置文件创建完成"
fi

# 更新 Java 配置文件
JAVA_CONFIG="$PROJECT_ROOT/demo-app/src/main/resources/contracts.properties"
if [ -f "$JAVA_CONFIG" ]; then
    echo "更新 Java 配置文件..."
    cat > "$JAVA_CONFIG" << EOF
# 合约地址配置
# 自动生成于: $(date)

contract.auth.address=$AUTH_ADDR
contract.account.address=$ACCOUNT_ADDR
contract.fiattoken.address=$FIATTOKEN_ADDR
contract.ticket.address=$TICKET_ADDR
contract.exchange.address=$EXCHANGE_ADDR
EOF
    echo "  ✅ Java 配置文件更新完成"
else
    echo "  ⚠️  Java 配置文件不存在，创建新文件"
    mkdir -p "$(dirname "$JAVA_CONFIG")"
    cat > "$JAVA_CONFIG" << EOF
# 合约地址配置
# 自动生成于: $(date)

contract.auth.address=$AUTH_ADDR
contract.account.address=$ACCOUNT_ADDR
contract.fiattoken.address=$FIATTOKEN_ADDR
contract.ticket.address=$TICKET_ADDR
contract.exchange.address=$EXCHANGE_ADDR
EOF
    echo "  ✅ Java 配置文件创建完成"
fi

# 备份部署信息
BACKUP_DIR="$PROJECT_ROOT/backups"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/deployment_$(date +%Y%m%d_%H%M%S).json"
cp "$DEPLOYMENT_INFO" "$BACKUP_FILE"
echo ""
echo "部署信息已备份到: $BACKUP_FILE"

echo ""
echo "=== 合约地址更新完成 ==="
echo ""
echo "下一步:"
echo "  1. 重启前端应用以加载新的合约地址"
echo "  2. 运行测试验证合约功能"
echo ""
