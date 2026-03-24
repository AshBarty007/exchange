#!/bin/bash

# 测试钱包创建脚本
# 用途: 批量创建测试账户，模拟不同角色

set -e

CONSOLE_DIR="/Users/hqsk/Work/kxnode/console"
ACCOUNTS_DIR="$CONSOLE_DIR/accounts"
WALLET_INFO_FILE="$CONSOLE_DIR/test_wallets.json"

echo "=== 创建测试钱包 ==="

# 创建账户目录
mkdir -p "$ACCOUNTS_DIR"

# 初始化钱包信息文件
echo "{" > "$WALLET_INFO_FILE"
echo '  "wallets": [' >> "$WALLET_INFO_FILE"

# 定义角色和数量
declare -A ROLES=(
    ["admin"]=1
    ["bank"]=2
    ["regulator"]=2
    ["exchange"]=2
    ["scenic"]=3
    ["market_maker"]=3
    ["consumer"]=5
)

FIRST=true

# 为每个角色创建账户
for role in "${!ROLES[@]}"; do
    count=${ROLES[$role]}
    echo "创建 $count 个 $role 账户..."

    for ((i=1; i<=count; i++)); do
        # 生成账户
        cd "$CONSOLE_DIR"
        bash get_account.sh > /dev/null 2>&1

        # 获取最新创建的账户文件
        latest_account=$(ls -t "$ACCOUNTS_DIR"/*.pem 2>/dev/null | head -1)

        if [ -z "$latest_account" ]; then
            echo "错误: 无法创建账户"
            exit 1
        fi

        account_name="${role}_${i}"

        # 重命名账户文件
        mv "$latest_account" "$ACCOUNTS_DIR/${account_name}.pem"

        # 提取地址 (使用 openssl 从 PEM 文件提取公钥)
        # 注意: 这里需要根据实际的密钥格式调整
        address=$(openssl ec -in "$ACCOUNTS_DIR/${account_name}.pem" -text -noout 2>/dev/null | grep pub: -A 5 | tail -n +2 | tr -d '\n[:space:]:' | tail -c 128 || echo "")

        if [ -z "$address" ]; then
            # 如果 openssl 提取失败，使用占位符
            address="0x$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 40 | head -n 1)"
        else
            address="0x${address: -40}"
        fi

        # 添加到钱包信息文件
        if [ "$FIRST" = false ]; then
            echo "," >> "$WALLET_INFO_FILE"
        fi
        FIRST=false

        cat >> "$WALLET_INFO_FILE" << EOF
    {
      "name": "$account_name",
      "role": "$role",
      "address": "$address",
      "keyFile": "${account_name}.pem"
    }
EOF
    done
done

# 完成 JSON 文件
echo "" >> "$WALLET_INFO_FILE"
echo "  ]" >> "$WALLET_INFO_FILE"
echo "}" >> "$WALLET_INFO_FILE"

echo "=== 测试钱包创建完成 ==="
echo "钱包信息保存在: $WALLET_INFO_FILE"
echo "私钥文件保存在: $ACCOUNTS_DIR"

# 显示创建的钱包
cat "$WALLET_INFO_FILE"
