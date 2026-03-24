#!/bin/bash

# ====================== 你只需要改这里 ========================
# 你的服务器IP
SERVER_IP="192.168.120.32"

# 服务器登录用户名
SERVER_USER="root"

# 服务器项目目录（你放docker-compose的目录）
SERVER_PATH="/home/hqsk/KXBASE"

# 前端dist路径（本地）
FRONTEND_DIST="./frontend/dist"

echo "==================================="
echo "  本地构建镜像（兼容Mac M系列）"
echo "==================================="

# 1. 本地构建（关键：指定平台）
cd backend
# mvn clean package -DskipTests

# docker build --platform linux/amd64 -t kx-backend:latest .

# # 2. 导出镜像
# echo "导出镜像..."
# docker save -o kx-backend.tar kx-backend:latest

# # 3. 上传镜像到服务器

# echo "上传镜像..."
# scp kx-backend.tar $SERVER_USER@$SERVER_IP:$SERVER_PATH/


# # 4. 上传前端 dist（你本地先 npm run build）
echo "上传前端..."
cd ..
scp -r frontend/dist $SERVER_USER@$SERVER_IP:$SERVER_PATH/frontend/

# # 5. 服务器执行：加载镜像 + 重启
# echo "服务器重启服务..."
# ssh $SERVER_USER@$SERVER_IP "
# cd $SERVER_PATH &&
# docker load -i kx-backend.tar &&
# docker-compose down &&
# docker-compose up -d
# "

echo "==================================="
echo "🎉 部署完成！全程秒启动！"
echo "==================================="