#!/bin/bash

# 合约测试脚本
# 用途: 测试合约的核心功能

set -e

CONSOLE_DIR="/Users/hqsk/Work/kxnode/console"
DEPLOYMENT_INFO="$CONSOLE_DIR/deployment_info.json"
WALLET_INFO="$CONSOLE_DIR/test_wallets.json"

echo "=== 开始测试合约 ==="

# 检查部署信息文件
if [ ! -f "$DEPLOYMENT_INFO" ]; then
    echo "错误: 未找到部署信息文件 $DEPLOYMENT_INFO"
    echo "请先运行 deploy_contracts.sh 部署合约"
    exit 1
fi

# 检查钱包信息文件
if [ ! -f "$WALLET_INFO" ]; then
    echo "错误: 未找到钱包信息文件 $WALLET_INFO"
    echo "请先运行 create_test_wallets.sh 创建测试钱包"
    exit 1
fi

# 检查 jq 命令
if ! command -v jq &> /dev/null; then
    echo "错误: 需要安装 jq 命令来解析 JSON"
    echo "macOS: brew install jq"
    echo "Linux: apt-get install jq 或 yum install jq"
    exit 1
fi

cd "$CONSOLE_DIR"

# 读取合约地址
AUTH_ADDR=$(jq -r '.contracts.Auth' "$DEPLOYMENT_INFO")
ACCOUNT_ADDR=$(jq -r '.contracts.Account' "$DEPLOYMENT_INFO")
FIATTOKEN_ADDR=$(jq -r '.contracts.FiatToken' "$DEPLOYMENT_INFO")
TICKET_ADDR=$(jq -r '.contracts.Ticket' "$DEPLOYMENT_INFO")
EXCHANGE_ADDR=$(jq -r '.contracts.Exchange' "$DEPLOYMENT_INFO")

echo "合约地址:"
echo "  Auth: $AUTH_ADDR"
echo "  Account: $ACCOUNT_ADDR"
echo "  FiatToken: $FIATTOKEN_ADDR"
echo "  Ticket: $TICKET_ADDR"
echo "  Exchange: $EXCHANGE_ADDR"
echo ""

# 读取测试钱包地址
ADMIN_ADDR=$(jq -r '.wallets[] | select(.role=="admin") | .address' "$WALLET_INFO" | head -1)
BANK_ADDR=$(jq -r '.wallets[] | select(.role=="bank") | .address' "$WALLET_INFO" | head -1)
SCENIC_ADDR=$(jq -r '.wallets[] | select(.role=="scenic") | .address' "$WALLET_INFO" | head -1)
MM_ADDR=$(jq -r '.wallets[] | select(.role=="market_maker") | .address' "$WALLET_INFO" | head -1)
CONSUMER_ADDR=$(jq -r '.wallets[] | select(.role=="consumer") | .address' "$WALLET_INFO" | head -1)

echo "测试账户:"
echo "  Admin: $ADMIN_ADDR"
echo "  Bank: $BANK_ADDR"
echo "  Scenic: $SCENIC_ADDR"
echo "  Market Maker: $MM_ADDR"
echo "  Consumer: $CONSUMER_ADDR"
echo ""

# 创建测试脚本
TEST_SCRIPT=$(mktemp)

cat > "$TEST_SCRIPT" << TEST_EOF
# 测试 1: 权限管理
echo "=== 测试 Auth 合约 ==="
echo "获取 BANK_ROLE..."
call Auth $AUTH_ADDR BANK_ROLE

echo "授予银行角色..."
call Auth $AUTH_ADDR grantRole [BANK_ROLE_HASH] $BANK_ADDR

echo "授予景区角色..."
call Auth $AUTH_ADDR grantRole [SCENIC_ROLE_HASH] $SCENIC_ADDR

echo "授予做市商角色..."
call Auth $AUTH_ADDR grantRole [MM_ROLE_HASH] $MM_ADDR

echo "检查银行角色..."
call Auth $AUTH_ADDR hasRole [BANK_ROLE_HASH] $BANK_ADDR

echo ""
echo "=== 测试 Account 合约 ==="
echo "注册景区主账户..."
call Account $ACCOUNT_ADDR registerMainAccount $SCENIC_ADDR [SCENIC_ROLE_HASH] "Scenic Area 1"

echo "注册做市商主账户..."
call Account $ACCOUNT_ADDR registerMainAccount $MM_ADDR [MM_ROLE_HASH] "Market Maker 1"

echo "为景区创建子账户..."
call Account $ACCOUNT_ADDR createSubAccount $SCENIC_ADDR "Scenic Sub Account 1"

echo "获取景区子账户列表..."
call Account $ACCOUNT_ADDR getSubAccounts $SCENIC_ADDR

echo ""
echo "=== 测试 FiatToken 合约 ==="
echo "银行铸造法币通证给做市商..."
call FiatToken $FIATTOKEN_ADDR mint $MM_ADDR 1000000000000000000000

echo "查询做市商余额..."
call FiatToken $FIATTOKEN_ADDR balanceOf $MM_ADDR

echo "查询总供应量..."
call FiatToken $FIATTOKEN_ADDR totalSupply

echo ""
echo "=== 测试 Ticket 合约 ==="
echo "景区发行门票..."
# 参数: name, totalSupply, price, validFrom, validUntil, infoHash
call Ticket $TICKET_ADDR issueTicket "Test Ticket" 1000 100000000000000000000 $(date +%s) $(($(date +%s) + 86400 * 30)) "QmHash123"

echo "获取门票信息..."
call Ticket $TICKET_ADDR getTicketInfo 1

echo "查询景区子账户门票余额..."
# 需要先获取子账户地址
call Ticket $TICKET_ADDR balanceOf [SCENIC_SUB_ADDR] 1

echo ""
echo "=== 测试完成 ==="
echo "请查看上面的输出验证测试结果"

exit
TEST_EOF

echo "启动控制台进行测试..."
echo "注意: 某些测试需要手动替换角色哈希和地址"
echo ""

# 提示用户
read -p "按 Enter 键继续，或 Ctrl+C 取消..."

# 启动控制台
bash start.sh < "$TEST_SCRIPT"

# 清理临时文件
rm -f "$TEST_SCRIPT"

echo ""
echo "=== 测试流程结束 ==="
