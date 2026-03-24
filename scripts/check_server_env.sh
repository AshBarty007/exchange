#!/bin/bash

# 服务器环境检查脚本
# 用途: 检查服务器环境是否满足部署要求

set -e

SERVER_USER="hqsk"
SERVER_HOST="your-server-ip"  # 修改为实际服务器IP

echo "==================================="
echo "  服务器环境检查"
echo "==================================="
echo ""

if [ "$SERVER_HOST" = "your-server-ip" ]; then
    echo "错误: 请先修改脚本中的 SERVER_HOST 变量"
    exit 1
fi

echo "连接服务器: ${SERVER_USER}@${SERVER_HOST}"
echo ""

ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'

echo "1. 检查 Java 环境..."
if command -v java &> /dev/null; then
    java_version=$(java -version 2>&1 | head -1)
    echo "  ✅ Java: $java_version"
else
    echo "  ❌ Java 未安装"
    echo "     安装命令: sudo yum install java-11-openjdk"
fi
echo ""

echo "2. 检查 FISCO BCOS 节点..."
if [ -d "/home/hqsk/fisco" ]; then
    echo "  ✅ FISCO 目录存在: /home/hqsk/fisco"

    if ps aux | grep -v grep | grep fisco-bcos > /dev/null; then
        node_count=$(ps aux | grep -v grep | grep fisco-bcos | wc -l)
        echo "  ✅ FISCO 节点运行中 ($node_count 个节点)"
    else
        echo "  ⚠️  FISCO 节点未运行"
        echo "     启动命令: cd /home/hqsk/fisco/nodes/127.0.0.1 && bash start_all.sh"
    fi
else
    echo "  ❌ FISCO 目录不存在"
fi
echo ""

echo "3. 检查 SDK 证书..."
if [ -d "/home/hqsk/fisco/nodes/127.0.0.1/sdk" ]; then
    echo "  ✅ SDK 证书目录存在"

    if [ -f "/home/hqsk/fisco/nodes/127.0.0.1/sdk/ca.crt" ]; then
        echo "  ✅ ca.crt 存在"
    else
        echo "  ❌ ca.crt 不存在"
    fi

    if [ -f "/home/hqsk/fisco/nodes/127.0.0.1/sdk/sdk.crt" ]; then
        echo "  ✅ sdk.crt 存在"
    else
        echo "  ❌ sdk.crt 不存在"
    fi

    if [ -f "/home/hqsk/fisco/nodes/127.0.0.1/sdk/sdk.key" ]; then
        echo "  ✅ sdk.key 存在"
    else
        echo "  ❌ sdk.key 不存在"
    fi
else
    echo "  ❌ SDK 证书目录不存在"
fi
echo ""

echo "4. 检查控制台..."
if [ -d "/home/hqsk/fisco/console" ]; then
    echo "  ✅ 控制台目录存在"

    if [ -f "/home/hqsk/fisco/console/start.sh" ]; then
        echo "  ✅ start.sh 存在"
    else
        echo "  ⚠️  start.sh 不存在"
    fi
else
    echo "  ❌ 控制台目录不存在"
fi
echo ""

echo "5. 检查部署信息..."
if [ -f "/home/hqsk/fisco/console/deployment_info.json" ]; then
    echo "  ✅ deployment_info.json 存在"
else
    echo "  ⚠️  deployment_info.json 不存在"
    echo "     需要先部署合约"
fi
echo ""

echo "6. 检查测试钱包..."
if [ -d "/home/hqsk/fisco/console/accounts" ]; then
    wallet_count=$(ls -1 /home/hqsk/fisco/console/accounts/*.pem 2>/dev/null | wc -l)
    echo "  ✅ 测试钱包目录存在 ($wallet_count 个钱包)"
else
    echo "  ⚠️  测试钱包目录不存在"
    echo "     创建命令: mkdir -p /home/hqsk/fisco/console/accounts"
fi
echo ""

echo "7. 检查端口..."
if netstat -tlnp 2>/dev/null | grep :20200 > /dev/null; then
    echo "  ✅ 端口 20200 开放"
else
    echo "  ⚠️  端口 20200 未开放"
fi

if netstat -tlnp 2>/dev/null | grep :9090 > /dev/null; then
    echo "  ⚠️  端口 9090 已被占用"
else
    echo "  ✅ 端口 9090 可用"
fi
echo ""

echo "8. 检查磁盘空间..."
disk_usage=$(df -h /home | tail -1 | awk '{print $5}' | sed 's/%//')
disk_avail=$(df -h /home | tail -1 | awk '{print $4}')
if [ $disk_usage -lt 80 ]; then
    echo "  ✅ 磁盘空间充足 (已使用 $disk_usage%, 可用 $disk_avail)"
else
    echo "  ⚠️  磁盘空间不足 (已使用 $disk_usage%, 可用 $disk_avail)"
fi
echo ""

echo "9. 检查内存..."
mem_total=$(free -h | grep Mem | awk '{print $2}')
mem_avail=$(free -h | grep Mem | awk '{print $7}')
echo "  总内存: $mem_total, 可用: $mem_avail"
echo ""

echo "10. 检查防火墙..."
if command -v firewall-cmd &> /dev/null; then
    if firewall-cmd --state 2>/dev/null | grep running > /dev/null; then
        echo "  ✅ 防火墙运行中"
        if firewall-cmd --list-ports 2>/dev/null | grep 9090 > /dev/null; then
            echo "  ✅ 端口 9090 已开放"
        else
            echo "  ⚠️  端口 9090 未开放"
            echo "     开放命令: sudo firewall-cmd --add-port=9090/tcp --permanent && sudo firewall-cmd --reload"
        fi
    else
        echo "  ⚠️  防火墙未运行"
    fi
else
    echo "  ⚠️  未安装 firewalld"
fi

ENDSSH

echo ""
echo "==================================="
echo "  检查完成"
echo "==================================="
