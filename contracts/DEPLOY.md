# KXDEX 合约部署说明

## 前置要求

- FISCO BCOS 3.x 节点已运行
- WeBASE-Front 或 console 工具可用
- 部署账户已准备好私钥

---

## 合约文件清单

部署前确认以下文件均已编译：

| 文件 | 类型 | 说明 |
|------|------|------|
| `Utils.sol` | Library | 工具库，被其他合约依赖 |
| `Auth.sol` | 逻辑合约 | 权限管理 |
| `AccountStorage.sol` | 存储合约 | 账户数据持久化 |
| `FiatStorage.sol` | 存储合约 | 法币余额持久化 |
| `TicketStorage.sol` | 存储合约 | 门票数据持久化 |
| `Account.sol` | 逻辑合约 | 账户管理 |
| `FiatToken.sol` | 逻辑合约 | 法币凭证 |
| `Ticket.sol` | 逻辑合约 | 门票 NFT |
| `Exchange.sol` | 逻辑合约 | 交易撮合 |
| `Router.sol` | 路由合约 | 统一入口 |

接口文件（`IAuth.sol` / `IAccount.sol` / `IFiatToken.sol` / `ITicket.sol` / `IExchange.sol`）仅用于编译期类型检查，无需单独部署。

---

## 部署步骤

### 第一步：部署 Auth

```
合约：Auth
构造参数：无
```

部署后记录地址，后续所有合约都依赖它。

> 部署者地址自动获得 `ADMIN_ROLE`。

---

### 第二步：部署三个 Storage 合约

三个合约相互独立，可并行部署，均无构造参数。

```
合约：AccountStorage
构造参数：无

合约：FiatStorage
构造参数：无

合约：TicketStorage
构造参数：无
```

记录三个地址：`accountStorageAddress` / `fiatStorageAddress` / `ticketStorageAddress`

---

### 第三步：部署 Account

```
合约：Account
构造参数：
  authContract     = <Auth 地址>
  accountStorage   = <AccountStorage 地址>
```

---

### 第四步：部署 FiatToken

```
合约：FiatToken
构造参数：
  authContract     = <Auth 地址>
  accountContract  = <Account 地址>
  fiatStorage      = <FiatStorage 地址>
```

---

### 第五步：部署 Ticket

```
合约：Ticket
构造参数：
  authContract     = <Auth 地址>
  accountContract  = <Account 地址>
  ticketStorage    = <TicketStorage 地址>
```

---

### 第六步：部署 Exchange

```
合约：Exchange
构造参数：
  authContract       = <Auth 地址>
  accountContract    = <Account 地址>
  fiatTokenContract  = <FiatToken 地址>
  ticketContract     = <Ticket 地址>
  _feeCollector      = <手续费收款地址>
```

> `_feeCollector` 填写接收 0.5% 手续费的账户地址，可以是部署者地址，后续通过 `setFeeCollector` 修改。

---

### 第七步：部署 Router

```
合约：Router
构造参数：
  _auth      = <Auth 地址>
  _account   = <Account 地址>
  _fiatToken = <FiatToken 地址>
  _ticket    = <Ticket 地址>
  _exchange  = <Exchange 地址>
```

---

## 初始化调用

部署完成后，必须按顺序执行以下初始化调用，否则合约无法正常工作。

### 1. 关联 Auth ↔ Account

```solidity
// 调用方：部署者（任意账户，只能设置一次）
auth.setAccountContract(<Account 地址>)
```

此步骤让 Auth 在授予角色时能自动注册主账户。

### 2. 设置 Storage 的逻辑合约

```solidity
// 调用方：各 Storage 合约的 owner（即部署者）
accountStorage.setLogicContract(<Account 地址>)
fiatStorage.setLogicContract(<FiatToken 地址>)
ticketStorage.setLogicContract(<Ticket 地址>)
```

Storage 合约只接受来自 `logicContract` 的写入，此步骤必须在任何业务操作之前完成。

### 3. 关联 FiatToken ↔ Exchange

```solidity
// 调用方：拥有 BANK_ROLE 的账户
fiatToken.setExchangeContract(<Exchange 地址>)
```

此步骤让 Exchange 合约在撮合时有权调用 `transferFrom`。

> 注意：`setExchangeContract` 需要 `BANK_ROLE`。如果部署者还没有 `BANK_ROLE`，先执行下方的角色授予，再回来执行此步骤。

---

## 角色授予

初始化完成后，为各参与方授予对应角色。调用方须持有 `ADMIN_ROLE`。

```solidity
// 授予银行角色
auth.grantRole(auth.BANK_ROLE(), <银行账户地址>)

// 授予监管角色
auth.grantRole(auth.REGULATOR_ROLE(), <监管账户地址>)

// 授予交易所管理员角色
auth.grantRole(auth.EXCHANGE_ADMIN_ROLE(), <交易所管理员地址>)

// 授予景区运营角色（授予后自动注册主账户）
auth.grantRole(auth.SCENIC_OPERATOR_ROLE(), <景区运营账户地址>)

// 授予做市商角色（授予后自动注册主账户）
auth.grantRole(auth.MARKET_MAKER_ROLE(), <做市商账户地址>)
```

---

## 部署后验证

按以下顺序验证部署是否正确：

```solidity
// 1. 验证 Auth 关联
auth.getContractAdmin()                          // 应返回部署者地址
// （无直接查询接口，可通过 hasRole 验证）
auth.hasRole(auth.ADMIN_ROLE(), <部署者地址>)    // 应返回 true

// 2. 验证 Storage 关联
accountStorage.logicContract()   // 应返回 Account 地址
fiatStorage.logicContract()      // 应返回 FiatToken 地址
ticketStorage.logicContract()    // 应返回 Ticket 地址

// 3. 验证 FiatToken 关联
fiatToken.exchangeContract()     // 应返回 Exchange 地址

// 4. 验证 Router 地址
router.getContractAddresses()    // 应返回所有合约地址
```

---

## 合约升级

Storage 合约永不重新部署，升级只需替换逻辑合约。

### 升级 Account / FiatToken / Ticket

```
1. 部署新版本逻辑合约（传入相同的 Auth 和 Storage 地址）
2. 调用对应 Storage 的 setLogicContract(<新合约地址>)
3. 如果升级的是 Account，还需调用 auth.setAccountContract(<新合约地址>)
   （注意：setAccountContract 只能设置一次，需要修改 Auth 合约才能重设）
4. 如果升级的是 FiatToken，还需调用 fiatToken.setExchangeContract(exchange)
   并通知 Exchange 更新 _fiatToken 地址（需重新部署 Exchange）
```

### 升级 Exchange

Exchange 自身存储订单数据，升级时订单数据无法迁移，需通知用户撤单后重新部署。

```
1. 通知所有用户撤销活跃订单
2. 部署新版 Exchange（传入相同的 Auth、Account、FiatToken、Ticket 地址）
3. 调用 fiatToken.setExchangeContract(<新 Exchange 地址>)
4. 重新部署 Router（传入新 Exchange 地址）
```

---

## 地址记录模板

部署完成后填写以下地址，保存到 `config/deployed-contracts.json`：

```json
{
  "auth": "",
  "accountStorage": "",
  "fiatStorage": "",
  "ticketStorage": "",
  "account": "",
  "fiatToken": "",
  "ticket": "",
  "exchange": "",
  "router": ""
}
```
