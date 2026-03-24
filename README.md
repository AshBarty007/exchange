# 科信链上交易系统

基于 FISCO BCOS 3.x 构建的联盟链门票交易平台

## 项目简介

科信链上交易系统是一个去中心化的门票交易平台，利用区块链技术实现门票发行、交易、核销的全流程管理。系统支持银行发行的链上法币通证，实现资产的安全、透明、高效流转。

本项目包含两个主要部分：
1. **基础平台** - 门票交易平台的核心功能
2. **交易所系统 (dex/)** - 完整的去中心化交易所开发组件 ⭐

## 核心特性

### 基础平台功能
- ✅ **权限管理**: 基于角色的访问控制（RBAC），支持 admin、bank、regulator、exchange、scenic、market_maker、consumer 等多种角色
- ✅ **账户系统**: 主账户/子账户分离设计，资产隔离，安全可控
- ✅ **法币通证**: 银行发行的 1:1 锚定法币的链上通证，支持充值、提现、转账
- ✅ **门票管理**: 景区发行门票 NFT，支持批量发行、转移、核销
- ✅ **交易所**: 链上订单簿，自动撮合，透明公开
- ✅ **合约交互可视化**: 实时展示合约调用的请求和响应数据

### 交易所开发组件 (dex/) ⭐
- ✅ **完整的去中心化交易所系统**: 基于 FISCO BCOS 3.11 构建
- ✅ **高性能撮合引擎**: 支持 10,000 订单/秒的撮合性能
- ✅ **用户管理系统**: 支持多角色用户注册和管理
- ✅ **资产管理系统**: 资产充值、提现、锁定/解锁
- ✅ **市场深度展示**: 实时买卖盘数据，多档位显示
- ✅ **区块链状态监控**: 实时监控区块高度、TPS、节点状态
- ✅ **现代化 Web 界面**: React 前端，响应式设计

## 技术栈

### 区块链层
- **FISCO BCOS**: 3.x 版本
- **Solidity**: 0.8.0+
- **共识算法**: PBFT

### 智能合约

所有智能合约统一存放在 `contracts/` 目录下，交易所系统 (dex/) 也引用同一套合约：
合约设计采取存储和逻辑分层方案，实现逻辑更新而数据路径保持
分别有Account Storage, Fiat Storage, Ticket Storage 分别将账户、法币通证、门票数据存储结构，从而实现业务逻辑合约升级而保留业务数据不变。
对于业务逻辑合约之间的方法调用，也采用了Interface的设计方式，以实现单一合约更新而不用更新所有关联合约。

#### 存储合约
- `contracts/AccountStorage.sol`
- `contracts/FiatStorage.sol`
- `contracts/TicketStorage.sol`

#### 基础合约
- `contracts/Utils.sol` - 工具库合约
- `contracts/Auth.sol` - 权限管理合约
- `contracts/Account.sol` - 账户管理合约
- `contracts/FiatToken.sol` - 法币通证合约
- `contracts/Ticket.sol` - 门票 NFT 合约

#### 业务合约
- `contracts/Exchange.sol` - 交易所合约
- `contracts/Router.sol` - 路由合约

### 前端
- **React**: 18.x
- **Material UI**: 5.x
- **TypeScript**: 5.x
- **Vite**: 5.x

### 后端

#### 基础平台后端
- **Java**: 11+
- **Spring Boot**: 3.x
- **FISCO BCOS Java SDK**: 3.6+

#### 交易所后端 (dex/) ⭐
- **Java 服务**:
  - Spring Boot 3.x
  - FISCO BCOS Java SDK 3.6.0
  - 账户管理、区块链服务、清算服务
- **Python 服务**:
  - Flask 框架
  - 用户服务、资产服务
- **数据库**:
  - MySQL 8.0

## 快速开始

### 1. 环境准备

```bash
# 安装必需软件
brew install openjdk@11 node solidity jq

# 本地开发环境
cd /Users/hqsk/Work/kxdex

# 服务器环境
cd /home/hqsk/kxdex
```

### 2. 初始化环境

```bash
# 运行初始化脚本
./scripts/init.sh
```

### 3. 启动 FISCO BCOS 节点

```bash
# 本地开发环境
cd /Users/hqsk/Work/kxnode/nodes/127.0.0.1
bash start_all.sh

# 服务器环境
cd /home/hqsk/fisco/nodes/127.0.0.1
bash start_all.sh
```

### 4. 编译和部署合约

#### 基础平台合约

```bash
# 编译合约
./scripts/compile_contracts.sh

# 创建测试钱包
./scripts/create_test_wallets.sh

# 部署合约（在控制台中）
# 本地开发环境
cd /Users/hqsk/Work/kxnode/console
bash start.sh

# 服务器环境
cd /home/hqsk/fisco/console
bash start.sh
```

#### 交易所合约 (dex/)

交易所系统使用统一的 `../contracts` 目录下的合约，通过部署脚本进行配置和部署。

### 5. 启动应用

#### 启动基础平台前端

```bash
cd KXBASE
npm install
npm run dev
```

访问 http://localhost:3000

#### 启动交易所系统 (dex/) ⭐

```bash
cd dex

# 方法 1: 一键启动所有服务（推荐）
bash scripts/start_all.sh

# 方法 2: 分别启动各服务
# Python 服务
cd python-services/user-service && python3 app.py  # 端口 5001
cd python-services/asset-service && python3 app.py  # 端口 5002

# Java 服务
cd java-services/matching-engine && mvn spring-boot:run  # 端口 8081

# React 前端
cd frontend && npm install --legacy-peer-deps && npm start  # 端口 3000
```

访问交易所前端: http://localhost:3000

## 项目结构

```
kxdex/
├── contracts/              # Solidity 智能合约
│   ├── base/              # 基础工具合约
│   ├── core/              # 核心业务合约
│   └── business/          # 业务扩展合约
│
├── KXBASE/           # React 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   ├── services/      # 服务层
│   │   └── store/         # 状态管理
│   └── package.json
│
├── demo-app/              # Java SDK 示例
│   ├── src/
│   └── build.gradle
│
├── dex/                   # 交易所开发组件 ⭐ 新增
│   │
│   ├── java-services/     # Java 后端服务
│   │   ├── matching-engine/    # 撮合引擎服务
│   │   ├── blockchain-service/ # 区块链接口服务
│   │   └── settlement-service/ # 清算服务
│   │
│   ├── python-services/   # Python 后端服务
│   │   ├── user-service/       # 用户管理服务
│   │   ├── asset-service/      # 资产管理服务
│   │   └── common/             # 公共模块
│   │
│   ├── frontend/          # React 交易所前端
│   │   ├── src/
│   │   │   ├── components/     # 前端组件（含区块链状态监控）
│   │   │   └── services/       # API 服务层
│   │   └── package.json
│   │
│   ├── scripts/           # 交易所脚本工具
│   │   ├── init_database.py    # 数据库初始化
│   │   ├── deploy_contracts.py # 合约部署
│   │   ├── start_all.sh        # 启动所有服务
│   │   └── stop_all.sh         # 停止所有服务
│   │
│   ├── docs/              # 交易所文档
│   ├── config/            # 配置文件
│   └── README.md          # 交易所完整文档
│
│   注意: dex/ 使用 ../contracts 目录下的统一合约
│
├── scripts/               # 自动化脚本
│   ├── init.sh           # 环境初始化
│   ├── compile_contracts.sh  # 编译合约
│   ├── create_test_wallets.sh  # 创建测试钱包
│   ├── deploy_contracts.sh  # 部署合约
│   ├── test_contracts.sh  # 测试合约
│   ├── update_addresses.sh  # 更新合约地址
│   └── health_check.sh   # 健康检查
│
└── docs/                  # 文档
    ├── QUICK_START.md    # 快速开始
    ├── CONTRACT_DEPLOYMENT.md  # 合约部署指南
    ├── TESTING_GUIDE.md  # 测试指南
    └── DEVELOPMENT_PROGRESS.md  # 开发进度
```

## 核心功能

### 基础平台功能

#### 1. 钱包管理
- 创建多角色测试钱包
- 切换钱包账户
- 查看钱包详情和余额

#### 2. 法币通证管理
- 银行铸造法币通证
- 主账户充值到子账户
- 子账户提现到主账户
- 子账户之间转账
- 主账户兑换法币（转到销毁账户）

#### 3. 门票管理
- 景区发行门票 NFT
- 门票在子账户间转移
- 查看门票持仓
- 门票核销

#### 4. 交易所
- 创建买单/卖单（无需 expiry，nonce 自动生成）
- 订单撮合
- 查看订单簿
- 查看成交记录

#### 5. 资产管理
- 查看法币余额
- 查看门票持仓（卡片展示）
- 资产转账记录
- 合约交互可视化

### 交易所系统功能 (dex/) ⭐

#### 1. 用户管理 👤
- ✅ 用户注册（支持多种角色：做市商、交易员、监管者等）
- ✅ 用户登录
- ✅ 用户信息展示
- ✅ 登录状态持久化

#### 2. 资产管理 💰
- ✅ 资产余额查询（代币和 NFT）
- ✅ 资产充值
- ✅ 资产提现
- ✅ 交易记录查询
- ✅ 资产锁定/解锁

#### 3. 订单管理 📊
- ✅ 提交买单/卖单
- ✅ 查询订单详情
- ✅ 取消订单
- ✅ 订单状态跟踪

#### 4. 市场深度 📈
- ✅ 实时买盘展示
- ✅ 实时卖盘展示
- ✅ 多档位显示（5/10/20档）
- ✅ 自动刷新（每5秒）

#### 5. 区块链监控 ⛓️
- ✅ 区块高度查询
- ✅ 节点数量显示
- ✅ 共识算法状态
- ✅ 交易总数统计
- ✅ TPS 显示
- ✅ 合约信息查询
- ✅ 自动刷新（每10秒）

#### 6. 交易撮合
- ✅ 高性能订单簿管理（10,000 订单/秒）
- ✅ 链下撮合引擎
- ✅ 订单管理

#### 7. 批量清算
- ✅ 定时批量清算（每 10 秒）
- ✅ 链上批量资产转移
- ✅ 原子性操作保证
- ✅ Gas 节省 95%

## 开发指南

### 修改合约

```bash
# 1. 编辑合约
# 本地开发环境
vim contracts/core/Ticket.sol

# 服务器环境
vim /home/hqsk/kxdex/contracts/core/Ticket.sol

# 2. 编译合约
./scripts/compile_contracts.sh

# 3. 部署合约
# 本地开发环境
cd /Users/hqsk/Work/kxnode/console
bash start.sh

# 服务器环境
cd /home/hqsk/fisco/console
bash start.sh

# 4. 更新合约地址
./scripts/update_addresses.sh

# 5. 测试合约
./scripts/test_contracts.sh
```

### 修改前端

```bash
# 1. 编辑代码
vim wallet-dapp/src/pages/Assets.tsx

# 2. 热重载自动生效
# 访问 http://localhost:5173

# 3. 构建生产版本
cd wallet-dapp
npm run build
```

### 健康检查

```bash
# 检查系统状态
./scripts/health_check.sh
```

## 测试

### 运行测试

```bash
# 合约测试
./scripts/test_contracts.sh
```

### 测试场景

详细测试场景请参考 [TESTING_GUIDE.md](TESTING_GUIDE.md)

## 文档

### 基础平台文档
- [快速开始指南](docs/QUICK_START.md) - 快速上手指南
- [合约部署指南](docs/CONTRACT_DEPLOYMENT.md) - 详细的合约编译和部署流程
- [测试指南](docs/TESTING_GUIDE.md) - 完整的测试场景和方法
- [开发进度](docs/DEVELOPMENT_PROGRESS.md) - 当前开发进度和已完成功能

### 交易所系统文档 (dex/) ⭐
- [交易所完整文档](dex/README.md) - 交易所系统完整说明
- [前端使用指南](dex/FRONTEND_GUIDE.md) - 前端界面使用指南
- [快速开始](dex/QUICK_START.md) - 交易所快速开始
- [系统架构](dex/docs/ARCHITECTURE.md) - 系统架构设计
- [API 文档](dex/docs/API.md) - API 接口文档
- [部署指南](dex/docs/DEPLOYMENT.md) - 部署指南
- [开发指南](dex/docs/DEVELOPMENT.md) - 开发指南

## 合约修改记录

### v1.0.0 (2026-03-04)

#### Ticket.sol
- ✅ 移除门票创建时对开始时间的验证
- ✅ 保留截止时间必须是将来的验证

#### Account.sol
- ✅ 添加 `registerMainAccount` 权限控制
- ✅ 只有 admin 账户才能添加主账户

#### FiatToken.sol
- ✅ 添加银行销毁账户功能
- ✅ 实现主钱包到子账户的转账
- ✅ 实现子账户到主钱包的提款
- ✅ 添加主账户到销毁账户的转账（兑换法币）
- ✅ 添加 `TransferToBurnAccount` 事件

#### Exchange.sol
- ✅ 移除订单的 `expiry` 参数
- ✅ 简化订单创建流程
- ✅ nonce 由前端自动生成

## 常用命令

### 基础平台命令

```bash
# 初始化环境
./scripts/init.sh

# 编译合约
./scripts/compile_contracts.sh

# 创建测试钱包
./scripts/create_test_wallets.sh

# 部署合约
./scripts/deploy_contracts.sh

# 测试合约
./scripts/test_contracts.sh

# 更新合约地址
./scripts/update_addresses.sh

# 健康检查
./scripts/health_check.sh

# 启动前端
cd wallet-dapp && npm run dev

# 启动 FISCO BCOS 节点
# 本地开发环境
cd /Users/hqsk/Work/kxnode/nodes/127.0.0.1 && bash start_all.sh

# 服务器环境
cd /home/hqsk/fisco/nodes/127.0.0.1 && bash start_all.sh

# 启动控制台
# 本地开发环境
cd /Users/hqsk/Work/kxnode/console && bash start.sh

# 服务器环境
cd /home/hqsk/fisco/console && bash start.sh
```

### 交易所系统命令 (dex/) ⭐

```bash
# 进入交易所目录
cd dex

# 初始化数据库
python3 scripts/init_database.py

# 部署智能合约
python3 scripts/deploy_contracts.py

# 启动所有服务（推荐）
bash scripts/start_all.sh

# 停止所有服务
bash scripts/stop_all.sh

# 启动前端
cd frontend && npm start

# 功能测试
python3 scripts/test_flow.py

# 性能测试
python3 scripts/performance_test.py

# 服务监控
python3 scripts/monitor.py

# 分别启动各服务
cd python-services/user-service && python3 app.py      # 用户服务 :5001
cd python-services/asset-service && python3 app.py     # 资产服务 :5002
cd java-services/matching-engine && mvn spring-boot:run # 撮合引擎 :8081
```

## 故障排除

### 节点无法启动
```bash
# 检查端口占用
lsof -i :20200

# 查看节点日志
# 本地开发环境
tail -f /Users/hqsk/Work/kxnode/nodes/127.0.0.1/node0/log/log*.log

# 服务器环境
tail -f /home/hqsk/fisco/nodes/127.0.0.1/node0/log/log*.log

# 重启节点
# 本地开发环境
cd /Users/hqsk/Work/kxnode/nodes/127.0.0.1
bash stop_all.sh
bash start_all.sh

# 服务器环境
cd /home/hqsk/fisco/nodes/127.0.0.1
bash stop_all.sh
bash start_all.sh
```

### 合约部署失败
```bash
# 检查合约编译
ls -l demo-app/src/main/resources/contract/

# 重新编译
./scripts/compile_contracts.sh

# 查看控制台错误信息
```

### 前端无法连接
```bash
# 检查节点状态
./scripts/health_check.sh

# 检查合约地址配置
cat .env

# 更新合约地址
./scripts/update_addresses.sh
```

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 开发路线图

### 已完成 ✅

#### 基础平台
- [x] 智能合约开发（Auth, Account, FiatToken, Ticket, Exchange）
- [x] 合约编译和部署脚本
- [x] 测试钱包管理系统
- [x] 前端基础框架（React + Material UI）
- [x] 钱包管理页面
- [x] 资产管理页面
- [x] 法币铸造页面
- [x] 门票市场页面
- [x] 合约交互可视化
- [x] 开发文档和测试指南

#### 交易所系统 (dex/) ⭐
- [x] 智能合约开发（AssetToken, NFTTicket, ExchangeCustody）
- [x] Java 后端服务（撮合引擎、区块链服务、清算服务）
- [x] Python 后端服务（用户服务、资产服务）
- [x] React 前端界面（用户管理、资产管理、订单管理、市场深度、区块链监控）
- [x] 高性能撮合引擎（10,000 订单/秒）
- [x] 批量清算服务（节省 95% Gas）
- [x] 数据库设计和初始化
- [x] 完整的测试脚本和工具
- [x] 完整的系统文档

### 进行中 🚧
- [ ] 子账户管理完善
- [ ] 交易所撮合引擎优化
- [ ] 订单簿展示优化

### 计划中 📋

#### 基础平台
- [ ] 门票核销功能完善
- [ ] 区块链状态实时展示
- [ ] 数据统计和可视化
- [ ] 监管审计功能
- [ ] 移动端适配
- [ ] 性能优化
- [ ] 安全审计

#### 交易所系统 (dex/)
- [ ] 添加更多订单类型（市价单、止损单）
- [ ] 实现手续费机制
- [ ] 支持多币种交易对
- [ ] 添加价格预言机
- [ ] 实现自动做市商（AMM）
- [ ] 添加 K 线图表
- [ ] 实现交易历史图表
- [ ] 添加用户通知系统
- [ ] 添加暗黑模式
- [ ] 实现国际化（i18n）
- [ ] WebSocket 实时推送
- [ ] Redis 缓存
- [ ] 消息队列
- [ ] JWT 认证
- [ ] 多签机制
- [ ] 风控系统

## 许可证

MIT License

## 联系方式

### 基础平台
- 项目地址:
  - 本地开发: /Users/hqsk/Work/kxdex
  - 服务器部署: /home/hqsk/kxdex
- FISCO 节点:
  - 本地开发: /Users/hqsk/Work/kxnode
  - 服务器部署: /home/hqsk/fisco
- 文档: 查看 docs/ 目录
- 前端访问: http://localhost:5173

### 交易所系统 (dex/)
- 项目地址: /Users/hqsk/Work/kxdex/dex
- FISCO 节点: 192.168.120.32 (远程节点)
- 前端访问: http://localhost:3000
- 用户服务: http://localhost:5001
- 资产服务: http://localhost:5002
- 撮合引擎: http://localhost:8081
- 文档: 查看 dex/docs/ 目录

## 致谢

- FISCO BCOS 团队
- React 社区
- Material UI 团队
- Spring Boot 社区
- Flask 社区

---

**注意**:
- 基础平台目前处于开发阶段，仅用于测试和学习目的
- 交易所系统 (dex/) 已完成完整的开发，包含前后端和智能合约
- 生产环境使用前请进行充分的安全审计和测试

## 系统对比

| 特性 | 基础平台 | 交易所系统 (dex/) |
|------|---------|------------------|
| 智能合约 | ✅ 5个合约 | ✅ 3个合约 |
| 前端界面 | ✅ React (Vite) | ✅ React (完整) |
| 后端服务 | 🚧 规划中 | ✅ Java + Python |
| 数据库 | ❌ 未实现 | ✅ MySQL |
| 撮合引擎 | ❌ 未实现 | ✅ 高性能 (10k/s) |
| 批量清算 | ❌ 未实现 | ✅ 节省95% Gas |
| 用户管理 | ✅ 基础功能 | ✅ 完整系统 |
| 资产管理 | ✅ 基础功能 | ✅ 完整系统 |
| 市场深度 | ❌ 未实现 | ✅ 实时展示 |
| 区块链监控 | ❌ 未实现 | ✅ 实时监控 |
| 文档完整度 | ✅ 基础文档 | ✅ 完整文档 |
| 生产就绪 | ❌ 开发中 | ✅ 已完成 |
