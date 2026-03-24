# EIP-712 签名指南

## 概述

合约已升级为 EIP-712 标准签名，防止跨链/跨合约重放攻击，并限制签名最大有效期为 1 小时。

## 安全改进

### 1. 限制签名有效期
- 最大有效期：`1 hours`（可在合约中调整 `MAX_SIGNATURE_VALIDITY`）
- 防止签名永久有效导致的安全风险

### 2. EIP-712 域分隔符
签名包含以下信息，防止跨链/跨合约重放：
- `name`: "KXDEX Exchange"
- `version`: "1"
- `chainId`: 当前链 ID
- `verifyingContract`: Exchange 合约地址

## 前端签名实现

### 安装依赖
```bash
npm install ethers@6
```

### 1. 创建订单签名

```javascript
import { ethers } from 'ethers';

// 合约地址和主账户钱包
const exchangeAddress = '0x...'; // Exchange 合约地址
const mainAccountWallet = new ethers.Wallet(privateKey, provider);

// 查询当前 nonce
const exchange = new ethers.Contract(exchangeAddress, exchangeABI, provider);
const nonce = await exchange.getNonce(mainAccountWallet.address);

// 订单参数
const subAccount = '0x...';
const orderType = 0; // 0=BUY, 1=SELL
const ticketId = 1;
const price = ethers.parseUnits('100', 18);
const amount = 10;
const expiry = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期

// EIP-712 域定义
const domain = {
  name: 'KXDEX Exchange',
  version: '1',
  chainId: await provider.getNetwork().then(n => n.chainId),
  verifyingContract: exchangeAddress
};

// 类型定义
const types = {
  CreateOrder: [
    { name: 'subAccount', type: 'address' },
    { name: 'orderType', type: 'uint8' },
    { name: 'ticketId', type: 'uint256' },
    { name: 'price', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' }
  ]
};

// 消息内容
const message = {
  subAccount,
  orderType,
  ticketId,
  price,
  amount,
  nonce,
  expiry
};

// 签名（使用 signTypedData）
const signature = await mainAccountWallet.signTypedData(domain, types, message);

// 提交交易（可以由任何人提交，不暴露主账户）
const tx = await exchange.createOrder(
  subAccount,
  orderType,
  ticketId,
  price,
  amount,
  expiry,
  signature
);
await tx.wait();
```

### 2. 撤单签名

```javascript
// 订单 ID
const orderId = 123;
const expiry = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期

// EIP-712 域定义（同上）
const domain = {
  name: 'KXDEX Exchange',
  version: '1',
  chainId: await provider.getNetwork().then(n => n.chainId),
  verifyingContract: exchangeAddress
};

// 类型定义
const types = {
  CancelOrder: [
    { name: 'orderId', type: 'uint256' },
    { name: 'expiry', type: 'uint256' }
  ]
};

// 消息内容
const message = {
  orderId,
  expiry
};

// 签名
const signature = await mainAccountWallet.signTypedData(domain, types, message);

// 提交交易
const tx = await exchange.cancelOrder(orderId, expiry, signature);
await tx.wait();
```

### 3. 管理员撤单（无需签名）

```javascript
// 管理员直接调用，expiry=0, signature=空bytes
const tx = await exchange.cancelOrder(orderId, 0, '0x');
await tx.wait();
```

## 签名验证流程

### 合约端验证步骤

1. **检查签名是否过期**
   ```solidity
   require(block.timestamp <= expiry, "Signature expired");
   ```

2. **检查有效期是否过长**
   ```solidity
   require(expiry <= block.timestamp + MAX_SIGNATURE_VALIDITY, "Expiry too far in future");
   ```

3. **构造 EIP-712 结构哈希**
   ```solidity
   bytes32 structHash = keccak256(abi.encode(
       CREATE_ORDER_TYPEHASH,
       subAccount, orderType, ticketId, price, amount, nonce, expiry
   ));
   ```

4. **生成最终摘要**
   ```solidity
   bytes32 digest = keccak256(abi.encodePacked(
       "\x19\x01",
       DOMAIN_SEPARATOR,
       structHash
   ));
   ```

5. **恢复签名者地址并验证**
   ```solidity
   address recovered = ecrecover(digest, v, r, s);
   require(recovered == mainAccount, "Invalid signature");
   ```

## 安全注意事项

### 1. Nonce 管理
- Nonce 在主账户维度递增（不是子账户）
- 每次签名前必须查询最新 nonce
- Nonce 消耗后立即递增，防止重放

### 2. 签名有效期
- 建议设置较短的有效期（如 5-30 分钟）
- 合约强制最大有效期为 1 小时
- 过期签名会被拒绝

### 3. 主账户隔离
- 主账户只用于签名，不发送交易
- 交易可由子账户、中继服务或任何人提交
- 主账户地址不会出现在链上交易记录中

### 4. 域分隔符
- 签名绑定到特定链和合约
- 无法在其他链或合约上重放
- 升级合约时需要重新签名

## 常见问题

### Q: 为什么 nonce 要在签名前查询？
A: Nonce 用于防重放，每次签名消耗一个 nonce。签名前必须查询最新值，否则签名会因 nonce 不匹配而失败。

### Q: 签名可以重复使用吗？
A: 不可以。每个签名包含唯一的 nonce，使用后立即失效。

### Q: 主账户私钥泄露怎么办？
A: 立即调用 Auth 合约冻结主账户，所有子账户会同时被冻结，防止资产损失。

### Q: 可以提前签名多个订单吗？
A: 可以，但需要预测未来的 nonce 值（当前 nonce + 0, +1, +2...），且必须按顺序提交。

### Q: 管理员撤单为什么不需要签名？
A: 管理员有特殊权限，可以直接撤单（如处理异常订单）。传入 `expiry=0` 和空签名即可。

## 测试示例

```javascript
// 完整测试流程
async function testOrderFlow() {
  // 1. 查询 nonce
  const nonce = await exchange.getNonce(mainAccount);
  console.log('Current nonce:', nonce);

  // 2. 签名创建订单
  const signature = await signCreateOrder({
    subAccount,
    orderType: 0,
    ticketId: 1,
    price: ethers.parseUnits('100', 18),
    amount: 10,
    nonce,
    expiry: Math.floor(Date.now() / 1000) + 1800 // 30分钟
  });

  // 3. 提交订单（由子账户提交，主账户不上链）
  const tx = await exchange.connect(subAccountWallet).createOrder(
    subAccount,
    0, // BUY
    1, // ticketId
    ethers.parseUnits('100', 18),
    10,
    Math.floor(Date.now() / 1000) + 1800,
    signature
  );

  const receipt = await tx.wait();
  console.log('Order created:', receipt.logs);

  // 4. 验证 nonce 已递增
  const newNonce = await exchange.getNonce(mainAccount);
  console.log('New nonce:', newNonce); // nonce + 1
}
```

## 合约常量

```solidity
// Exchange.sol
uint256 public constant MAX_SIGNATURE_VALIDITY = 1 hours;

bytes32 public constant CREATE_ORDER_TYPEHASH = keccak256(
    "CreateOrder(address subAccount,uint8 orderType,uint256 ticketId,uint256 price,uint256 amount,uint256 nonce,uint256 expiry)"
);

bytes32 public constant CANCEL_ORDER_TYPEHASH = keccak256(
    "CancelOrder(uint256 orderId,uint256 expiry)"
);
```

## 相关文档

- [EIP-712 标准](https://eips.ethereum.org/EIPS/eip-712)
- [ethers.js signTypedData](https://docs.ethers.org/v6/api/providers/#Signer-signTypedData)
- [合约部署文档](./README.md)
