#!/usr/bin/env python3
"""
监控脚本 - 检查所有服务状态
"""
import requests
import sys
from datetime import datetime

SERVICES = [
    {
        "name": "用户服务",
        "url": "http://localhost:5001/health",
        "port": 5001
    },
    {
        "name": "资产服务",
        "url": "http://localhost:5002/health",
        "port": 5002
    },
    {
        "name": "撮合引擎",
        "url": "http://localhost:8081/api/orders/health",
        "port": 8081
    },
    {
        "name": "区块链服务",
        "url": "http://localhost:8082/api/blockchain/health",
        "port": 8082
    },
    {
        "name": "清算服务",
        "url": "http://localhost:8083/api/settlement/health",
        "port": 8083
    }
]

def check_service(service):
    """检查单个服务状态"""
    try:
        response = requests.get(service["url"], timeout=3)
        if response.status_code == 200:
            return True, "运行中"
        else:
            return False, f"状态码: {response.status_code}"
    except requests.exceptions.ConnectionError:
        return False, "连接失败"
    except requests.exceptions.Timeout:
        return False, "超时"
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 70)
    print(f"  FISCO 链上交易所 - 服务监控")
    print(f"  检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    all_healthy = True
    results = []

    for service in SERVICES:
        is_healthy, status = check_service(service)
        results.append({
            "name": service["name"],
            "port": service["port"],
            "healthy": is_healthy,
            "status": status
        })

        if not is_healthy:
            all_healthy = False

    # 打印结果
    print(f"\n{'服务名称':<15} {'端口':<8} {'状态':<10} {'详情'}")
    print("-" * 70)

    for result in results:
        status_icon = "✓" if result["healthy"] else "✗"
        status_text = "正常" if result["healthy"] else "异常"

        print(f"{result['name']:<15} {result['port']:<8} "
              f"{status_icon} {status_text:<8} {result['status']}")

    print("-" * 70)

    # 统计
    healthy_count = sum(1 for r in results if r["healthy"])
    total_count = len(results)

    print(f"\n总计: {healthy_count}/{total_count} 服务正常运行")

    if all_healthy:
        print("\n✓ 所有服务运行正常！")
        return 0
    else:
        print("\n✗ 部分服务异常，请检查日志")
        return 1

if __name__ == "__main__":
    sys.exit(main())
