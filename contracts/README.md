# KXDEX 合约文档

KXDEX 是基于 FISCO BCOS 联盟链的去中心化门票交易平台。

---

## 快速启动

**前置要求**: Node.js 16+, Java 11+, FISCO BCOS 3.x

```bash
# 启动后端
cd KXBASE/backend && mvn clean package && java -jar target/kxdex-backend.jar

# 启动前端
cd KXBASE && npm install && npm run dev
```

访问 `http://localhost:5173`，在 `/settings` 配置合约地址后即可使用。

---

## 系统架构

```
前端 (React/TS)  →  后端 (Java/Spring)  →  FISCO BCOS
                                              ├── Auth.sol        权限管理
                                              ├── Account.sol     账户管理
                                              ├── FiatToken.sol   法币凭证
                                              ├── Ticket.sol      门票 NFT
                                              └── Exchange.sol    交易撮合
```

Storage 层（AccountStorage / FiatStorage / TicketStorage）持久化数据，逻辑合约可独立升级。

---

## 合约说明

### Auth.sol — 权限管理

7 种角色：`ADMIN_ROLE` / `REGULATOR_ROLE` / `BANK_ROLE` / `EXCHANGE_ADMIN_ROLE` / `SCENIC_OPERATOR_ROLE` / `MARKET_MAKER_ROLE` / `CONSUMER_ROLE`

- `grantRole` / `revokeRole`：仅 `ADMIN_ROLE` 可调用
- `freezeAccount` / `unfreezeAccount`：仅 `REGULATOR_ROLE` 或 `EXCHANGE_ADMIN_ROLE`
- `transferAdmin`：仅 `ADMIN_ROLE`
- 授予业务角色时自动在 Account 合约注册主账户

### Account.sol — 账户管理

主账户 + 子账户模式（最多 100 个子账户）。子账户地址由主账户地址 + index + 区块信息哈希生成。

- `createSubAccount`：仅 `SCENIC_OPERATOR_ROLE` 或 `MARKET_MAKER_ROLE` 可创建
- `registerMainAccount`：仅 Auth 合约可调用

### FiatToken.sol — 法币凭证

ERC20 风格，精度 4 位小数（最小单位 0.0001 元）。

- `mint` / `burn`：仅 `BANK_ROLE`
- 转账限制：子账户间、主→子（充值）、子→主（提现）、提现到银行地址、Exchange 合约发起的 transferFrom
- `_transferHistory` 存储在合约内，建议生产环境改为链下 indexer

### Ticket.sol — 门票 NFT

ERC1155 风格，支持多种票型。

- `issueTicket`：仅 `SCENIC_OPERATOR_ROLE`，门票铸造到指定子账户
- `verifyTicket`：核销时扣减余额和总供应量，仅 `SCENIC_OPERATOR_ROLE`
- `burn`：仅 `SCENIC_OPERATOR_ROLE`
- 转移校验：检查 `validFrom`（开售时间）和 `validUntil`（过期时间）
- `transferFrom` 调用方已通过 allowance 校验，允许 Exchange 合约发起转移

### Exchange.sol — 交易撮合

- 下单时锁定余额（买方锁定法币，卖方锁定门票）
- 撮合使用 `_activeOrderBook`（仅含活跃订单），成交/撤单后自动移除，避免全量遍历
- 成交价格以卖单价格为准，买方差价自动释放回可用余额
- 手续费 0.5%（50 basis points），从买方支付，转给 `feeCollector`
- `matchOrders`：管理员手动撮合，仅 `EXCHANGE_ADMIN_ROLE`

### Storage 合约

三个 Storage 合约（AccountStorage / FiatStorage / TicketStorage）均支持：
- `setLogicContract(address)`：更新逻辑合约地址，仅 owner
- `transferOwnership(address)`：转移 owner，仅 owner

---

## 业务流程

**交易流程**:
1. 买方 `fiatToken.approve(exchangeAddress, amount)`
2. 卖方 `ticket.approve(exchangeAddress, ticketId, amount)`
3. 卖方 `exchange.createOrder(SELL, ticketId, price, amount, sig)`
4. 买方 `exchange.createOrder(BUY, ticketId, price, amount, sig)` → 自动撮合
5. 成交：法币转卖方，门票转买方，手续费转 feeCollector

**门票核销**:
```solidity
ticket.verifyTicket(holderAddress, ticketId, amount); // 扣减余额，不可重复核销
```

---

## 部署顺序

```
1. Auth
2. AccountStorage / FiatStorage / TicketStorage
3. Account(auth, accountStorage)
4. FiatToken(auth, account, fiatStorage)
5. Ticket(auth, account, ticketStorage)
6. Exchange(auth, account, fiatToken, ticket, feeCollector)
7. Router(auth, account, fiatToken, ticket, exchange)

初始化：
- auth.setAccountContract(accountAddress)
- accountStorage.setLogicContract(accountAddress)
- fiatStorage.setLogicContract(fiatTokenAddress)
- ticketStorage.setLogicContract(ticketAddress)
- fiatToken.setExchangeContract(exchangeAddress)
```

---

## 已知问题 / 待优化

- `FiatToken._transferHistory` 链上无限增长，建议改为链下 indexer
- `Exchange.getAccountTrades` 全量扫描，数据量大时 gas 高，建议链下索引
- `Account._generateSubAccountAddress` 依赖 `block.timestamp`，矿工可操控，生产环境建议改用确定性派生
- `Order.expiry` 字段已存在但未使用，后续可在 `_canMatch` 中加入过期检查
