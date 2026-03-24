#!/bin/bash

# 系统健康检查脚本
# 用途: 检查系统各组件的运行状态

set -e

PROJECT_ROOT="/Users/hqsk/Work/kxdex/kxdex"
CONSOLE_DIR="/Users/hqsk/Work/kxnode/console"
NODE_DIR="/Users/hqsk/Work/kxnode/nodes/127.0.0.1"

echo "==================================="
echo "  系统健康检查"
echo "==================================="
echo ""

# 检查 FISCO BCOS 节点
echo "1. 检查 FISCO BCOS 节点..."
if ps aux | grep -v grep | grep fisco-bcos > /dev/null; then
    node_count=$(ps aux | grep -v grep | grep fisco-bcos | wc -l)
    echo "  ✅ FISCO BCOS 节点运行中 ($node_count 个节点)"

    # 检查节点日志
    if [ -d "$NODE_DIR/node0/log" ]; then
        latest_log=$(ls -t "$NODE_DIR/node0/log"/log*.log 2>/dev/null | head -1)
        if [ -n "$latest_log" ]; then
            error_count=$(grep -i "error" "$latest_log" 2>/dev/null | wc -l)
            if [ $error_count -gt 0 ]; then
                echo "  ⚠️  发现 $error_count 个错误日志"
            else
                echo "  ✅ 节点日志正常"
            fi
        fi
    fi
else
    echo "  ❌ FISCO BCOS 节点未运行"
    echo "     启动命令: cd $NODE_DIR && bash start_all.sh"
fi

echo ""

# 检查控制台
echo "2. 检查 FISCO BCOS 控制台..."
if [ -f "$CONSOLE_DIR/start.sh" ]; then
    echo "  ✅ 控制台已安装"

    # 检查部署信息
    if [ -f "$CONSOLE_DIR/deployment_info.json" ]; then
        echo "  ✅ 找到部署信息文件"
        if command -v jq &> /dev/null; then
            timestamp=$(jq -r '.timestamp' "$CONSOLE_DIR/deployment_info.json" 2>/dev/null)
            if [ -n "$timestamp" ] && [ "$timestamp" != "null" ]; then
                echo "     部署时间: $timestamp"
            fi
        fi
    else
        echo "  ⚠️  未找到部署信息文件"
        echo "     请先部署合约"
    fi
else
    echo "  ❌ 控制台未安装"
fi

echo ""

# 检查合约编译
echo "3. 检查合约编译..."
CONTRACT_DIR="$PROJECT_ROOT/demo-app/src/main/resources/contract"
if [ -d "$CONTRACT_DIR" ]; then
    contract_count=$(ls "$CONTRACT_DIR"/*.abi 2>/dev/null | wc -l)
    if [ $contract_count -gt 0 ]; then
        echo "  ✅ 找到 $contract_count 个已编译的合约"
    else
        echo "  ⚠️  未找到已编译的合约"
        echo "     编译命令: ./scripts/compile_contracts.sh"
    fi
else
    echo "  ❌ 合约输出目录不存在"
fi

echo ""

# 检查测试钱包
echo "4. 检查测试钱包..."
WALLET_INFO="$CONSOLE_DIR/test_wallets.json"
if [ -f "$WALLET_INFO" ]; then
    if command -v jq &> /dev/null; then
        wallet_count=$(jq '.wallets | length' "$WALLET_INFO" 2>/dev/null)
        if [ -n "$wallet_count" ] && [ "$wallet_count" != "null" ]; then
            echo "  ✅ 找到 $wallet_count 个测试钱包"
        else
            echo "  ⚠️  钱包信息文件格式错误"
        fi
    else
        echo "  ✅ 找到钱包信息文件"
    fi
else
    echo "  ⚠️  未找到测试钱包"
    echo "     创建命令: ./scripts/create_test_wallets.sh"
fi

echo ""

# 检查前端
echo "5. 检查前端应用..."
if [ -d "$PROJECT_ROOT/wallet-dapp/node_modules" ]; then
    echo "  ✅ 前端依赖已安装"
else
    echo "  ⚠️  前端依赖未安装"
    echo "     安装命令: cd wallet-dapp && npm install"
fi

if ps aux | grep -v grep | grep "vite" > /dev/null; then
    echo "  ✅ 前端开发服务器运行中"
else
    echo "  ⚠️  前端开发服务器未运行"
    echo "     启动命令: cd wallet-dapp && npm run dev"
fi

echo ""

# 检查配置文件
echo "6. 检查配置文件..."
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "  ✅ 环境配置文件存在"

    # 检查合约地址是否配置
    if grep -q "AUTH_ADDRESS=$" "$PROJECT_ROOT/.env"; then
        echo "  ⚠️  合约地址未配置"
        echo "     更新命令: ./scripts/update_addresses.sh"
    else
        echo "  ✅ 合约地址已配置"
    fi
else
    echo "  ⚠️  环境配置文件不存在"
    echo "     初始化命令: ./scripts/init.sh"
fi

echo ""

# 检查日志目录
echo "7. 检查日志..."
if [ -d "$PROJECT_ROOT/logs" ]; then
    log_count=$(ls "$PROJECT_ROOT/logs"/*.log 2>/dev/null | wc -l)
    if [ $log_count -gt 0 ]; then
        echo "  ✅ 找到 $log_count 个日志文件"

        # 检查最新日志
        latest_log=$(ls -t "$PROJECT_ROOT/logs"/*.log 2>/dev/null | head -1)
        if [ -n "$latest_log" ]; then
            log_size=$(du -h "$latest_log" | cut -f1)
            echo "     最新日志: $(basename "$latest_log") ($log_size)"
        fi
    else
        echo "  ✅ 日志目录存在（无日志文件）"
    fi
else
    echo "  ⚠️  日志目录不存在"
fi

echo ""

# 检查磁盘空间
echo "8. 检查磁盘空间..."
disk_usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $disk_usage -lt 80 ]; then
    echo "  ✅ 磁盘空间充足 (已使用 $disk_usage%)"
elif [ $disk_usage -lt 90 ]; then
    echo "  ⚠️  磁盘空间不足 (已使用 $disk_usage%)"
else
    echo "  ❌ 磁盘空间严重不足 (已使用 $disk_usage%)"
fi

echo ""

# 总结
echo "==================================="
echo "  健康检查完成"
echo "==================================="
echo ""

# 统计状态
total_checks=8
passed_checks=$(grep -c "✅" <<< "$(bash $0 2>&1)" || echo 0)
warning_checks=$(grep -c "⚠️" <<< "$(bash $0 2>&1)" || echo 0)
failed_checks=$(grep -c "❌" <<< "$(bash $0 2>&1)" || echo 0)

echo "检查结果:"
echo "  通过: $passed_checks"
echo "  警告: $warning_checks"
echo "  失败: $failed_checks"
echo ""

if [ $failed_checks -gt 0 ]; then
    echo "状态: ❌ 系统存在问题，请查看上面的详细信息"
    exit 1
elif [ $warning_checks -gt 0 ]; then
    echo "状态: ⚠️  系统基本正常，但有一些警告"
    exit 0
else
    echo "状态: ✅ 系统运行正常"
    exit 0
fi
