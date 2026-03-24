#!/usr/bin/env python3
"""
初始化数据库脚本
"""
import pymysql
import sys

def create_databases():
    """创建所有数据库"""

    databases = [
        {
            "name": "exchange_users",
            "description": "用户服务数据库"
        },
        {
            "name": "exchange_assets",
            "description": "资产服务数据库"
        },
        {
            "name": "exchange_matching",
            "description": "撮合引擎数据库"
        }
    ]

    print("=" * 60)
    print("初始化数据库")
    print("=" * 60)

    try:
        # 连接MySQL
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='Sun-Flower0914',
            charset='utf8mb4'
        )

        cursor = connection.cursor()

        for db in databases:
            print(f"\n创建数据库: {db['name']} ({db['description']})")

            # 删除已存在的数据库
            cursor.execute(f"DROP DATABASE IF EXISTS {db['name']}")

            # 创建数据库
            cursor.execute(f"CREATE DATABASE {db['name']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")

            print(f"✓ {db['name']} 创建成功")

        connection.commit()
        cursor.close()
        connection.close()

        print("\n" + "=" * 60)
        print("数据库初始化完成！")
        print("=" * 60)

    except Exception as e:
        print(f"数据库初始化失败: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    create_databases()
