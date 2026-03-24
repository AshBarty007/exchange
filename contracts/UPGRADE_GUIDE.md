# 合约升级指南 (2026-03-12)

## 升级概述

本次升级包含重大安全改进和性能优化，涉及以下合约：
- `Account.sol` - 子账户地址生成安全改进
- `Exchange.sol` - 主账户隔离 + EIP-712 签名 + 性能优化
- `FiatToken.sol` - 删除链上历史存储
- `Router.sol` - 接口适配
- `IExchange.sol` - 接口更新

## 重大变更

### 1. 主账户完全隔离

**变更内容：**
- 主账户不再直接调用合约，只用于签名
- 订单操作需要主账户签名 + 任何人提交交易
- 订单的 `account` 字段存储子账户地址

**影响：**
- ✅ 主账户地址不会出现在链上交易记录中
- ✅ 提高隐私性和安全性
- ⚠️ 前端需要改造签名流程

**迁移步骤：**
```javascript
// 旧方式（主账户直接调用）
await exchange.connect(mainAccountWallet).createOrder(
  orderType, ticketId, price, amount, signature
);

// 新方式（主账户签名，任何人提交）
const nonce = await exchange.getNonce(mainAccount);
const expiry = Math.floor(Date.now() / 1000) + 3600;
const signature = await signCreateOrder(mainAccountWallet, {
  subAccount, orderType, ticketId, price, amount, nonce, expiry
});

// 可以由子账户或中继服务提交
await exchange.connect(relayWallet).createOrder(
  subAccount, orderType, ticketId, price, amount, expiry, signature
);
```

### 2. EIP-712 标准签名

**变更内容：**
- 从 `eth_sign` 改为 `signTypedData`
- 签名包含域分隔符（chainId + 合约地址）
- 强制签名有效期最大 1 小时

**影响：**
- ✅ 防止跨链/跨合约重放攻击
- ✅ 签名不会永久有效
- ⚠️ 旧签名全部失效，需要重新签名

**迁移步骤：**
参考 `EIP712_SIGNING_GUIDE.md`

### 3. 接口变更

#### Exchange.createOrder
```solidity
// 旧接口
function createOrder(
  OrderType orderType,
  uint256 ticketId,
  uint256 price,
  uint256 amount,
  bytes memory signature
) external returns (uint256);

// 新接口
function createOrder(
  address subAccount,      // 新增：子账户地址
  OrderType orderType,
  uint256 ticketId,
  uint256 price,
  uint256 amount,
  uint256 expiry,          // 新增：签名过期时间
  bytes memory mainAccountSignature  // 改名：主账户签名
) external returns (uint256);
```

#### Exchange.cancelOrder
```solidity
// 旧接口
function cancelOrder(uint256 orderId) external returns (bool);

// 新接口
function cancelOrder(
  uint256 orderId,
  uint256 expiry,          // 新增：签名过期时间
  bytes memory mainAccountSignature  // 新增：主账户签名
) external returns (bool);
```

### 4. 删除链上历史存储

**变更内容：**
- 删除 `FiatToken._transferHistory` 数组
- 删除 `getTransferHistory*` 查询接口
- 历史数据通过事件索引查询

**影响：**
- ✅ 合约存储不再无限增长
- ✅ 降低 gas 消耗
- ⚠️ 前端需要改用事件查询历史

**迁移步骤：**
```javascript
// 旧方式（链上查询）
const history = await fiatToken.getTransferHistoryBatch(offset, limit);

// 新方式（事件查询）
const filter = fiatToken.filters.Transfer(fromAddress, toAddress);
const events = await fiatToken.queryFilter(filter, fromBlock, toBlock);
const history = events.map(e => ({
  from: e.args.from,
  to: e.args.to,
  amount: e.args.value,
  blockNumber: e.blockNumber,
  transactionHash: e.transactionHash
}));
```

### 5. 性能优化

**变更内容：**
- 添加 `_accountTrades` 和 `_ticketTrades` 索引
- `getActiveOrders`/`getBestPrices`/`getMarketDepth` 改用 `_activeOrderBook`
- `getAccountTrades` 和 `getOrderStats` 使用索引查询

**影响：**
- ✅ 查询性能不随历史数据增长而下降
- ✅ 降低 gas 消耗
- ✅ 无需前端改动

## 部署步骤

### 1. 准备工作

```bash
# 备份当前合约地址
export OLD_EXCHANGE=0x...
export OLD_FIAT_TOKEN=0x...
export OLD_ACCOUNT=0x...
export OLD_ROUTER=0x...

# 备份当前状态
# 导出所有活跃订单、用户余额等
```

### 2. 部署新合约

```bash
# 1. 部署新的 Account 合约（使用相同的 AccountStorage）
# 2. 部署新的 FiatToken 合约（使用相同的 FiatStorage）
# 3. 部署新的 Exchange 合约
# 4. 部署新的 Router 合约

# 注意：Storage 合约不需要重新部署
```

### 3. 初始化配置

```solidity
// 1. 更新 Auth 合约的 Account 引用
auth.setAccountContract(newAccountAddress);

// 2. 更新 Storage 的 logic 引用
accountStorage.setLogicContract(newAccountAddress);
fiatStorage.setLogicContract(newFiatTokenAddress);

// 3. 设置 Exchange 合约
fiatToken.setExchangeContract(newExchangeAddress);

// 4. 迁移活跃订单（如果需要）
// 通知用户重新挂单，或者管理员手动迁移
```

### 4. 前端升级

```bash
# 1. 更新合约地址配置
# 2. 更新 ABI 文件
# 3. 实现 EIP-712 签名逻辑
# 4. 改用事件查询历史数据
# 5. 测试所有功能
```

### 5. 验证

```bash
# 1. 测试主账户签名流程
# 2. 测试订单创建/撤单
# 3. 测试历史查询
# 4. 测试性能（对比旧合约）
```

## 兼容性说明

### 不兼容变更

1. **签名格式完全不同**
   - 旧签名无法在新合约上使用
   - 需要重新实现签名逻辑

2. **接口参数变更**
   - `createOrder` 和 `cancelOrder` 参数不同
   - 需要更新所有调用代码

3. **历史查询接口删除**
   - `getTransferHistory*` 不再存在
   - 必须改用事件查询

### 向后兼容

1. **Storage 合约不变**
   - 用户余额、授权等数据保持不变
   - 无需迁移用户资产

2. **查询接口大部分兼容**
   - `getOrder`、`getTrade`、`balanceOf` 等保持不变
   - 只有历史查询接口被删除

## 回滚方案

如果升级后发现问题，可以回滚到旧合约：

```solidity
// 1. 恢复 Auth 的 Account 引用
auth.setAccountContract(oldAccountAddress);

// 2. 恢复 Storage 的 logic 引用
accountStorage.setLogicContract(oldAccountAddress);
fiatStorage.setLogicContract(oldFiatTokenAddress);

// 3. 恢复 Exchange 引用
fiatToken.setExchangeContract(oldExchangeAddress);

// 4. 前端切回旧地址和旧 ABI
```

**注意：** 回滚后，新合约上创建的订单会丢失（因为订单数据存在 Exchange 合约内部，不在 Storage 中）。

## 测试清单

### 功能测试

- [ ] 主账户签名创建订单
- [ ] 子账户提交订单交易
- [ ] 中继服务提交订单交易
- [ ] 订单自动撮合
- [ ] 主账户签名撤单
- [ ] 管理员直接撤单
- [ ] 签名过期验证
- [ ] 签名有效期限制验证
- [ ] 跨链重放攻击防护验证

### 性能测试

- [ ] 创建 1000 个订单后查询性能
- [ ] 创建 10000 个订单后查询性能
- [ ] `getActiveOrders` 响应时间
- [ ] `getAccountTrades` 响应时间
- [ ] `getOrderStats` 响应时间
- [ ] Gas 消耗对比（旧 vs 新）

### 安全测试

- [ ] 主账户地址不出现在交易记录中
- [ ] Nonce 重放攻击测试
- [ ] 签名伪造测试
- [ ] 跨合约签名重放测试
- [ ] 签名过期测试
- [ ] 子账户地址可预测性测试

## 常见问题

### Q: 升级后旧订单怎么办？
A: 旧订单数据在旧 Exchange 合约中，有两种方案：
1. 通知用户撤单并在新合约重新挂单
2. 管理员导出旧订单，在新合约手动重建（需要用户重新签名）

### Q: 用户余额会丢失吗？
A: 不会。余额存储在 Storage 合约中，升级不影响。

### Q: 前端需要多久适配？
A: 主要工作是实现 EIP-712 签名和事件查询，预计 2-3 天。

### Q: 可以分阶段升级吗？
A: 不建议。新旧合约接口不兼容，建议一次性升级完成。

### Q: 升级期间需要停机吗？
A: 建议短暂停机（1-2 小时）完成合约部署和配置，避免数据不一致。

## 技术支持

如有问题，请参考：
- `EIP712_SIGNING_GUIDE.md` - 签名实现指南
- `README.md` - 合约架构文档
- `MEMORY.md` - 项目记忆文档

或联系开发团队。
