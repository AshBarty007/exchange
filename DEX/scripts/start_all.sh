#!/bin/bash

# FISCO 链上交易所 - 完整系统启动脚本

echo "=========================================="
echo "  FISCO 链上交易所 - 完整系统启动"
echo "=========================================="
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装"
    exit 1
fi

# 检查 Java
if ! command -v java &> /dev/null; then
    echo "❌ Java 未安装"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

echo "✓ Python 版本: $(python3 --version)"
echo "✓ Java 版本: $(java -version 2>&1 | head -n 1)"
echo "✓ Node.js 版本: $(node --version)"
echo ""

# 进入项目根目录
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)

# ========== 0. 检查远程 FISCO BCOS 节点 ==========
echo "0️⃣  检查远程 FISCO BCOS 3.11 节点 (192.168.120.32:/home/hqsk/fisco/)..."

# 检查节点是否运行
if curl -s -X POST -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"getBlockNumber","params":["group0"],"id":1}' \
    http://192.168.120.32:20200 > /dev/null 2>&1; then
    echo "   ✓ FISCO BCOS 3.11 节点运行正常"
else
    echo "   ⚠️  无法连接到远程节点"
    echo "   请确保远程节点已启动: ssh 192.168.120.32 'cd /home/hqsk/fisco && bash start_all.sh'"
    echo "   继续启动本地服务..."
fi
echo ""

# ========== 1. 启动 Python 服务 (使用虚拟环境) ==========
echo "1️⃣  启动用户服务 (端口 5001)..."
cd python-services/user-service
"$PROJECT_ROOT/py_env/bin/python" app.py > /tmp/user-service.log 2>&1 &
USER_SERVICE_PID=$!
echo "   PID: $USER_SERVICE_PID"
cd "$PROJECT_ROOT"

sleep 2

echo "2️⃣  启动资产服务 (端口 5002)..."
cd python-services/asset-service
"$PROJECT_ROOT/py_env/bin/python" app.py > /tmp/asset-service.log 2>&1 &
ASSET_SERVICE_PID=$!
echo "   PID: $ASSET_SERVICE_PID"
cd "$PROJECT_ROOT"

sleep 2

# ========== 2. 启动 Java 服务 ==========
echo "3️⃣  启动区块链服务 (端口 8082)..."
cd java-services/blockchain-service
mvn spring-boot:run > /tmp/blockchain-service.log 2>&1 &
BLOCKCHAIN_SERVICE_PID=$!
echo "   PID: $BLOCKCHAIN_SERVICE_PID"
cd "$PROJECT_ROOT"

sleep 5

echo "4️⃣  启动清算服务 (端口 8083)..."
cd java-services/settlement-service
mvn spring-boot:run > /tmp/settlement-service.log 2>&1 &
SETTLEMENT_SERVICE_PID=$!
echo "   PID: $SETTLEMENT_SERVICE_PID"
cd "$PROJECT_ROOT"

sleep 5

echo "5️⃣  启动撮合引擎 (端口 8081)..."
cd java-services/matching-engine
mvn spring-boot:run > /tmp/matching-engine.log 2>&1 &
MATCHING_ENGINE_PID=$!
echo "   PID: $MATCHING_ENGINE_PID"
cd "$PROJECT_ROOT"

echo ""
echo "⏳ 等待 Java 服务启动..."
sleep 15

# ========== 3. 启动前端 ==========
echo "6️⃣  启动前端界面 (端口 3000)..."
cd frontend

# 检查是否需要安装依赖
if [ ! -d "node_modules" ]; then
    echo "   📦 安装前端依赖..."
    npm install --legacy-peer-deps
fi

npm run dev&
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID"
cd "$PROJECT_ROOT"

echo ""
echo "=========================================="
echo "  ✅ 所有服务已启动"
echo "=========================================="
echo ""
echo "服务地址:"
echo "  - 前端界面:   http://localhost:3000"
echo "  - 用户服务:   http://localhost:5001"
echo "  - 资产服务:   http://localhost:5002"
echo "  - 撮合引擎:   http://localhost:8081"
echo "  - 区块链服务: http://localhost:8082"
echo "  - 清算服务:   http://localhost:8083"
echo ""
echo "日志文件:"
echo "  - 用户服务:   /tmp/user-service.log"
echo "  - 资产服务:   /tmp/asset-service.log"
echo "  - 区块链服务: /tmp/blockchain-service.log"
echo "  - 清算服务:   /tmp/settlement-service.log"
echo "  - 撮合引擎:   /tmp/matching-engine.log"
echo ""
echo "进程 ID:"
echo "  - 用户服务:   $USER_SERVICE_PID"
echo "  - 资产服务:   $ASSET_SERVICE_PID"
echo "  - 区块链服务: $BLOCKCHAIN_SERVICE_PID"
echo "  - 清算服务:   $SETTLEMENT_SERVICE_PID"
echo "  - 撮合引擎:   $MATCHING_ENGINE_PID"
echo "  - 前端界面:   $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 等待用户中断
wait
