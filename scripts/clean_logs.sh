#!/bin/bash

# 日志清理脚本
# 用途: 清理过期的日志文件

set -e

PROJECT_ROOT="/Users/hqsk/Work/kxdex/kxdex"
LOG_DIR="$PROJECT_ROOT/logs"
DAYS_TO_KEEP=7

echo "=== 清理日志文件 ==="
echo "日志目录: $LOG_DIR"
echo "保留天数: $DAYS_TO_KEEP"
echo ""

# 检查日志目录
if [ ! -d "$LOG_DIR" ]; then
    echo "日志目录不存在，无需清理"
    exit 0
fi

# 统计日志文件
TOTAL_FILES=$(find "$LOG_DIR" -name "*.log" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)

echo "当前状态:"
echo "  日志文件数: $TOTAL_FILES"
echo "  总大小: $TOTAL_SIZE"
echo ""

# 查找并删除过期日志
echo "查找过期日志..."
OLD_FILES=$(find "$LOG_DIR" -name "*.log" -type f -mtime +$DAYS_TO_KEEP)
OLD_COUNT=$(echo "$OLD_FILES" | grep -c "\.log" || echo 0)

if [ $OLD_COUNT -gt 0 ]; then
    echo "找到 $OLD_COUNT 个过期日志文件"

    # 显示将要删除的文件
    echo ""
    echo "将要删除的文件:"
    echo "$OLD_FILES" | while read file; do
        if [ -n "$file" ]; then
            size=$(du -h "$file" | cut -f1)
            mtime=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file")
            echo "  - $(basename "$file") ($size, $mtime)"
        fi
    done

    # 确认删除
    echo ""
    read -p "确认删除这些文件? (y/N) " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$OLD_FILES" | while read file; do
            if [ -n "$file" ] && [ -f "$file" ]; then
                rm -f "$file"
            fi
        done
        echo "  ✅ 已删除 $OLD_COUNT 个过期日志文件"
    else
        echo "  ⚠️  取消删除操作"
        exit 0
    fi
else
    echo "  ✅ 没有过期的日志文件"
fi

# 压缩旧日志
echo ""
echo "压缩旧日志..."
OLD_LOGS=$(find "$LOG_DIR" -name "*.log" -type f -mtime +1 ! -name "*.gz")
if [ -n "$OLD_LOGS" ]; then
    echo "$OLD_LOGS" | while read file; do
        if [ -n "$file" ] && [ -f "$file" ]; then
            gzip "$file"
            echo "  ✅ 已压缩: $(basename "$file")"
        fi
    done
else
    echo "  ✅ 没有需要压缩的日志文件"
fi

# 统计清理后的状态
echo ""
echo "清理后状态:"
REMAINING_FILES=$(find "$LOG_DIR" -name "*.log*" -type f | wc -l)
REMAINING_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
echo "  日志文件数: $REMAINING_FILES"
echo "  总大小: $REMAINING_SIZE"

echo ""
echo "=== 日志清理完成 ==="
