#!/bin/bash

# 项目统计脚本
# 用途: 统计项目的代码量、文件数等信息

set -e

PROJECT_ROOT="/Users/hqsk/Work/kxdex/kxdex"

echo "==================================="
echo "  项目统计信息"
echo "==================================="
echo ""

cd "$PROJECT_ROOT"

# 统计合约文件
echo "1. 智能合约统计"
CONTRACT_COUNT=$(find contracts -name "*.sol" -type f 2>/dev/null | wc -l)
CONTRACT_LINES=$(find contracts -name "*.sol" -type f -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo "  合约文件数: $CONTRACT_COUNT"
echo "  合约代码行数: $CONTRACT_LINES"
echo ""

# 统计脚本文件
echo "2. 脚本文件统计"
SCRIPT_COUNT=$(find scripts -name "*.sh" -type f 2>/dev/null | wc -l)
SCRIPT_LINES=$(find scripts -name "*.sh" -type f -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo "  脚本文件数: $SCRIPT_COUNT"
echo "  脚本代码行数: $SCRIPT_LINES"
echo ""

# 统计前端文件
echo "3. 前端代码统计"
if [ -d "wallet-dapp/src" ]; then
    FRONTEND_TS=$(find wallet-dapp/src -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    FRONTEND_LINES=$(find wallet-dapp/src -name "*.ts" -o -name "*.tsx" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
    echo "  TypeScript 文件数: $FRONTEND_TS"
    echo "  前端代码行数: $FRONTEND_LINES"
else
    echo "  前端目录不存在"
fi
echo ""

# 统计文档文件
echo "4. 文档统计"
DOC_COUNT=$(find . -maxdepth 1 -name "*.md" -type f 2>/dev/null | wc -l)
DOC_LINES=$(find . -maxdepth 1 -name "*.md" -type f -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo "  文档文件数: $DOC_COUNT"
echo "  文档行数: $DOC_LINES"
echo ""

# 统计配置文件
echo "5. 配置文件统计"
CONFIG_FILES=(".env.example" ".gitignore" "package.json" "Makefile")
CONFIG_COUNT=0
for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        CONFIG_COUNT=$((CONFIG_COUNT + 1))
    fi
done
echo "  配置文件数: $CONFIG_COUNT"
echo ""

# 总计
echo "6. 总计"
TOTAL_FILES=$((CONTRACT_COUNT + SCRIPT_COUNT + FRONTEND_TS + DOC_COUNT + CONFIG_COUNT))
TOTAL_LINES=$((CONTRACT_LINES + SCRIPT_LINES + FRONTEND_LINES + DOC_LINES))
echo "  总文件数: $TOTAL_FILES"
echo "  总代码行数: $TOTAL_LINES"
echo ""

# Git 统计
if [ -d ".git" ]; then
    echo "7. Git 统计"
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    BRANCH_COUNT=$(git branch | wc -l)
    echo "  提交次数: $COMMIT_COUNT"
    echo "  分支数: $BRANCH_COUNT"
    echo ""
fi

# 目录大小
echo "8. 目录大小"
PROJECT_SIZE=$(du -sh . 2>/dev/null | cut -f1)
echo "  项目总大小: $PROJECT_SIZE"

if [ -d "node_modules" ]; then
    NODE_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
    echo "  node_modules: $NODE_SIZE"
fi

if [ -d "wallet-dapp/node_modules" ]; then
    WALLET_NODE_SIZE=$(du -sh wallet-dapp/node_modules 2>/dev/null | cut -f1)
    echo "  wallet-dapp/node_modules: $WALLET_NODE_SIZE"
fi

echo ""
echo "==================================="
echo "  统计完成"
echo "==================================="
