#!/bin/bash

# 项目初始化脚本
# 用途: 一键初始化开发环境

set -e

PROJECT_ROOT="/Users/hqsk/Work/kxdex/kxdex"
CONSOLE_DIR="/Users/hqsk/Work/kxnode/console"

echo "==================================="
echo "  科信链上交易系统 - 环境初始化"
echo "==================================="
echo ""

# 检查必需的命令
echo "检查必需的命令..."
commands=("java" "node" "npm" "solc" "jq")
missing_commands=()

for cmd in "${commands[@]}"; do
    if ! command -v $cmd &> /dev/null; then
        missing_commands+=($cmd)
        echo "  ❌ $cmd 未安装"
    else
        version=$($cmd --version 2>&1 | head -1)
        echo "  ✅ $cmd: $version"
    fi
done

if [ ${#missing_commands[@]} -gt 0 ]; then
    echo ""
    echo "错误: 以下命令未安装: ${missing_commands[*]}"
    echo ""
    echo "安装指南:"
    echo "  - Java: brew install openjdk@11"
    echo "  - Node.js: brew install node"
    echo "  - Solidity: brew install solidity"
    echo "  - jq: brew install jq"
    exit 1
fi

echo ""
echo "检查 FISCO BCOS 节点..."
if [ ! -d "/Users/hqsk/Work/kxnode/nodes" ]; then
    echo "  ❌ FISCO BCOS 节点未找到"
    echo "  请先安装 FISCO BCOS 节点"
    exit 1
else
    echo "  ✅ FISCO BCOS 节点已安装"
fi

echo ""
echo "检查控制台..."
if [ ! -d "$CONSOLE_DIR" ]; then
    echo "  ❌ FISCO BCOS 控制台未找到"
    echo "  请先安装控制台"
    exit 1
else
    echo "  ✅ FISCO BCOS 控制台已安装"
fi

echo ""
echo "创建必要的目录..."
mkdir -p "$PROJECT_ROOT/scripts"
mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$PROJECT_ROOT/backups"
mkdir -p "$PROJECT_ROOT/demo-app/src/main/resources/contract"
echo "  ✅ 目录创建完成"

echo ""
echo "设置脚本权限..."
chmod +x "$PROJECT_ROOT/scripts"/*.sh
echo "  ✅ 脚本权限设置完成"

echo ""
echo "安装前端依赖..."
cd "$PROJECT_ROOT/wallet-dapp"
if [ ! -d "node_modules" ]; then
    npm install
    echo "  ✅ 前端依赖安装完成"
else
    echo "  ✅ 前端依赖已存在"
fi

echo ""
echo "编译合约..."
cd "$PROJECT_ROOT"
if [ -f "scripts/compile_contracts.sh" ]; then
    bash scripts/compile_contracts.sh
    echo "  ✅ 合约编译完成"
else
    echo "  ⚠️  编译脚本未找到，跳过编译"
fi

echo ""
echo "创建配置文件..."
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    cat > "$PROJECT_ROOT/.env" << 'EOF'
# FISCO BCOS 配置
FISCO_NODE_URL=127.0.0.1:20200
FISCO_GROUP_ID=group0

# 合约地址（部署后填写）
AUTH_ADDRESS=
ACCOUNT_ADDRESS=
FIATTOKEN_ADDRESS=
TICKET_ADDRESS=
EXCHANGE_ADDRESS=

# 开发配置
NODE_ENV=development
LOG_LEVEL=debug
EOF
    echo "  ✅ 配置文件创建完成"
else
    echo "  ✅ 配置文件已存在"
fi

echo ""
echo "==================================="
echo "  初始化完成！"
echo "==================================="
echo ""
echo "下一步操作:"
echo "  1. 启动 FISCO BCOS 节点:"
echo "     cd /Users/hqsk/Work/kxnode/nodes/127.0.0.1"
echo "     bash start_all.sh"
echo ""
echo "  2. 创建测试钱包:"
echo "     cd $PROJECT_ROOT"
echo "     ./scripts/create_test_wallets.sh"
echo ""
echo "  3. 部署合约:"
echo "     cd $CONSOLE_DIR"
echo "     bash start.sh"
echo ""
echo "  4. 启动前端:"
echo "     cd $PROJECT_ROOT/wallet-dapp"
echo "     npm run dev"
echo ""
echo "详细文档请查看:"
echo "  - QUICK_START.md - 快速开始指南"
echo "  - CONTRACT_DEPLOYMENT.md - 合约部署指南"
echo "  - TESTING_GUIDE.md - 测试指南"
echo ""
