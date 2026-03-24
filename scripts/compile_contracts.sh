#!/bin/bash

# 合约编译脚本
# 用途: 快速编译所有合约，便于开发阶段迭代

set -e

PROJECT_ROOT="/Users/hqsk/Work/kxdex/"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"
OUTPUT_DIR="$PROJECT_ROOT/demo-app/src/main/resources/contract"

echo "=== 开始编译合约 ==="

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 编译基础合约
echo "编译 Utils.sol..."
solc --abi --bin --overwrite -o "$OUTPUT_DIR" \
    "$CONTRACTS_DIR/base/Utils.sol"

# 编译核心合约
echo "编译 Auth.sol..."
solc --abi --bin --overwrite -o "$OUTPUT_DIR" \
    --allow-paths "$CONTRACTS_DIR" \
    "$CONTRACTS_DIR/core/Auth.sol"

echo "编译 Account.sol..."
solc --abi --bin --overwrite -o "$OUTPUT_DIR" \
    --allow-paths "$CONTRACTS_DIR" \
    "$CONTRACTS_DIR/core/Account.sol"

echo "编译 FiatToken.sol..."
solc --abi --bin --overwrite -o "$OUTPUT_DIR" \
    --allow-paths "$CONTRACTS_DIR" \
    "$CONTRACTS_DIR/core/FiatToken.sol"

echo "编译 Ticket.sol..."
solc --abi --bin --overwrite -o "$OUTPUT_DIR" \
    --allow-paths "$CONTRACTS_DIR" \
    "$CONTRACTS_DIR/core/Ticket.sol"

# 编译业务合约
echo "编译 Exchange.sol..."
solc --abi --bin --overwrite -o "$OUTPUT_DIR" \
    --allow-paths "$CONTRACTS_DIR" \
    "$CONTRACTS_DIR/business/Exchange.sol"

echo "=== 合约编译完成 ==="
echo "输出目录: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
