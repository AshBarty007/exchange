#!/bin/bash

# 开发环境重置脚本
# 用途: 重置开发环境到初始状态

set -e

PROJECT_ROOT="/Users/hqsk/Work/kxdex/kxdex"
CONSOLE_DIR="/Users/hqsk/Work/kxnode/console"

echo "==================================="
echo "  开发环境重置"
echo "==================================="
echo ""
echo "⚠️  警告: 此操作将删除以下内容:"
echo "  - 编译产物"
echo "  - 部署信息"
echo "  - 测试钱包"
echo "  - 日志文件"
echo "  - 临时文件"
echo ""
read -p "确认重置? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "取消重置操作"
    exit 0
fi

echo ""
echo "开始重置..."

# 备份当前状态
echo "1. 创建备份..."
if [ -f "$PROJECT_ROOT/scripts/backup.sh" ]; then
    bash "$PROJECT_ROOT/scripts/backup.sh"
    echo "  ✅ 备份完成"
else
    echo "  ⚠️  备份脚本不存在，跳过备份"
fi

# 清理编译产物
echo ""
echo "2. 清理编译产物..."
if [ -d "$PROJECT_ROOT/demo-app/src/main/resources/contract" ]; then
    rm -rf "$PROJECT_ROOT/demo-app/src/main/resources/contract"/*
    echo "  ✅ 编译产物已清理"
else
    echo "  ⚠️  编译产物目录不存在"
fi

# 清理部署信息
echo ""
echo "3. 清理部署信息..."
if [ -f "$CONSOLE_DIR/deployment_info.json" ]; then
    rm -f "$CONSOLE_DIR/deployment_info.json"
    echo "  ✅ 部署信息已清理"
else
    echo "  ⚠️  部署信息文件不存在"
fi

# 清理测试钱包
echo ""
echo "4. 清理测试钱包..."
if [ -f "$CONSOLE_DIR/test_wallets.json" ]; then
    rm -f "$CONSOLE_DIR/test_wallets.json"
    echo "  ✅ 测试钱包已清理"
else
    echo "  ⚠️  测试钱包文件不存在"
fi

if [ -d "$CONSOLE_DIR/accounts" ]; then
    rm -rf "$CONSOLE_DIR/accounts"/*
    echo "  ✅ 账户文件已清理"
else
    echo "  ⚠️  账户目录不存在"
fi

# 清理日志
echo ""
echo "5. 清理日志文件..."
if [ -d "$PROJECT_ROOT/logs" ]; then
    rm -rf "$PROJECT_ROOT/logs"/*
    echo "  ✅ 日志文件已清理"
else
    echo "  ⚠️  日志目录不存在"
fi

# 清理临时文件
echo ""
echo "6. 清理临时文件..."
find "$PROJECT_ROOT" -name "*.tmp" -type f -delete
find "$PROJECT_ROOT" -name "*.bak" -type f -delete
find "$PROJECT_ROOT" -name ".DS_Store" -type f -delete
echo "  ✅ 临时文件已清理"

# 清理前端构建产物
echo ""
echo "7. 清理前端构建产物..."
if [ -d "$PROJECT_ROOT/wallet-dapp/dist" ]; then
    rm -rf "$PROJECT_ROOT/wallet-dapp/dist"
    echo "  ✅ 前端构建产物已清理"
else
    echo "  ⚠️  前端构建目录不存在"
fi

# 重置环境配置
echo ""
echo "8. 重置环境配置..."
if [ -f "$PROJECT_ROOT/.env" ]; then
    rm -f "$PROJECT_ROOT/.env"
    echo "  ✅ 环境配置已清理"
fi

if [ -f "$PROJECT_ROOT/.env.example" ]; then
    cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
    echo "  ✅ 环境配置已重置"
else
    echo "  ⚠️  .env.example 文件不存在"
fi

echo ""
echo "==================================="
echo "  重置完成"
echo "==================================="
echo ""
echo "下一步操作:"
echo "  1. 重新初始化环境:"
echo "     ./scripts/init.sh"
echo ""
echo "  2. 编译合约:"
echo "     ./scripts/compile_contracts.sh"
echo ""
echo "  3. 创建测试钱包:"
echo "     ./scripts/create_test_wallets.sh"
echo ""
echo "  4. 部署合约:"
echo "     cd $CONSOLE_DIR"
echo "     bash start.sh"
echo ""
