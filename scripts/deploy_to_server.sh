#!/bin/bash

# 服务器部署脚本
# 用途: 自动化部署后端到服务器

set -e

# 配置变量
SERVER_USER="hqsk"
SERVER_HOST="your-server-ip"  # 修改为实际服务器IP
SERVER_PATH="/home/hqsk/kxdex"
LOCAL_BACKEND_PATH="/Users/hqsk/Work/kxdex/kxdex/wallet-dapp/backend"

echo "==================================="
echo "  服务器部署脚本"
echo "==================================="
echo ""

# 检查服务器配置
if [ "$SERVER_HOST" = "your-server-ip" ]; then
    echo "错误: 请先修改脚本中的 SERVER_HOST 变量"
    echo "编辑 scripts/deploy_to_server.sh，设置正确的服务器IP"
    exit 1
fi

# 1. 构建后端项目
echo "1. 构建后端项目..."
cd "$LOCAL_BACKEND_PATH"

if [ -f "pom.xml" ]; then
    echo "使用 Maven 构建..."
    mvn clean package -DskipTests
    JAR_FILE=$(find target -name "*.jar" -not -name "*-sources.jar" | head -1)
elif [ -f "build.gradle" ]; then
    echo "使用 Gradle 构建..."
    ./gradlew clean build -x test
    JAR_FILE=$(find build/libs -name "*.jar" | head -1)
else
    echo "错误: 未找到 pom.xml 或 build.gradle"
    exit 1
fi

if [ ! -f "$JAR_FILE" ]; then
    echo "错误: 构建失败，未找到 JAR 文件"
    exit 1
fi

echo "  ✅ 构建完成: $JAR_FILE"
echo ""

# 2. 创建服务器目录
echo "2. 创建服务器目录..."
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/{logs,config,backup}"
echo "  ✅ 目录创建完成"
echo ""

# 3. 备份旧版本
echo "3. 备份旧版本..."
ssh ${SERVER_USER}@${SERVER_HOST} "
    if [ -f ${SERVER_PATH}/wallet-backend.jar ]; then
        mv ${SERVER_PATH}/wallet-backend.jar ${SERVER_PATH}/backup/wallet-backend-\$(date +%Y%m%d_%H%M%S).jar
        echo '  ✅ 旧版本已备份'
    else
        echo '  ⚠️  未找到旧版本'
    fi
"
echo ""

# 4. 上传 JAR 文件
echo "4. 上传 JAR 文件..."
scp "$JAR_FILE" ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/wallet-backend.jar
echo "  ✅ JAR 文件上传完成"
echo ""

# 5. 上传配置文件
echo "5. 上传配置文件..."
scp src/main/resources/application.yml ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/config/
echo "  ✅ 配置文件上传完成"
echo ""

# 6. 检查 FISCO 节点
echo "6. 检查 FISCO 节点..."
ssh ${SERVER_USER}@${SERVER_HOST} "
    if ps aux | grep -v grep | grep fisco-bcos > /dev/null; then
        echo '  ✅ FISCO 节点运行中'
    else
        echo '  ⚠️  FISCO 节点未运行'
        echo '  启动命令: cd /home/hqsk/fisco/nodes/127.0.0.1 && bash start_all.sh'
    fi
"
echo ""

# 7. 检查证书文件
echo "7. 检查证书文件..."
ssh ${SERVER_USER}@${SERVER_HOST} "
    if [ -d /home/hqsk/fisco/nodes/127.0.0.1/sdk ]; then
        echo '  ✅ SDK 证书目录存在'
        ls -la /home/hqsk/fisco/nodes/127.0.0.1/sdk/ | grep -E '\.(crt|key)$' || echo '  ⚠️  证书文件可能缺失'
    else
        echo '  ❌ SDK 证书目录不存在'
    fi
"
echo ""

# 8. 重启服务
echo "8. 重启后端服务..."
read -p "是否重启服务? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    ssh ${SERVER_USER}@${SERVER_HOST} "
        # 停止旧服务
        if pgrep -f 'wallet-backend.jar' > /dev/null; then
            echo '  停止旧服务...'
            pkill -f 'wallet-backend.jar'
            sleep 2
        fi

        # 启动新服务
        echo '  启动新服务...'
        cd ${SERVER_PATH}
        nohup java -jar wallet-backend.jar --spring.profiles.active=prod > logs/backend.log 2>&1 &

        sleep 3

        # 检查服务状态
        if pgrep -f 'wallet-backend.jar' > /dev/null; then
            echo '  ✅ 服务启动成功'
        else
            echo '  ❌ 服务启动失败'
            echo '  查看日志: tail -f ${SERVER_PATH}/logs/backend.log'
        fi
    "
else
    echo "  ⚠️  跳过服务重启"
    echo "  手动启动命令:"
    echo "    ssh ${SERVER_USER}@${SERVER_HOST}"
    echo "    cd ${SERVER_PATH}"
    echo "    nohup java -jar wallet-backend.jar --spring.profiles.active=prod > logs/backend.log 2>&1 &"
fi

echo ""
echo "==================================="
echo "  部署完成"
echo "==================================="
echo ""
echo "后续操作:"
echo "  1. 查看日志:"
echo "     ssh ${SERVER_USER}@${SERVER_HOST} 'tail -f ${SERVER_PATH}/logs/backend.log'"
echo ""
echo "  2. 检查服务状态:"
echo "     ssh ${SERVER_USER}@${SERVER_HOST} 'curl http://localhost:9090/actuator/health'"
echo ""
echo "  3. 查看进程:"
echo "     ssh ${SERVER_USER}@${SERVER_HOST} 'ps aux | grep wallet-backend'"
echo ""
