#!/bin/bash

# FISCO 链上交易所 - 停止所有服务脚本

echo "=========================================="
echo "  停止所有服务"
echo "=========================================="
echo ""

# 停止 Python 服务
echo "🛑 停止 Python 服务..."
pkill -f "python.*user-service/app.py"
pkill -f "python.*asset-service/app.py"
echo "   ✓ Python 服务已停止"

# 停止 Java 服务
echo "🛑 停止 Java 服务..."
pkill -f "matching-engine"
echo "   ✓ Java 服务已停止"

# 停止前端服务
echo "🛑 停止前端服务..."
pkill -f "react-scripts"
pkill -f "node.*frontend"
echo "   ✓ 前端服务已停止"

echo ""
echo "=========================================="
echo "  ✅ 所有服务已停止"
echo "=========================================="
