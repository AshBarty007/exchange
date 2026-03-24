# CAS + WeBASE-Sign 账户映射设计方案

## 1. 整体架构

```
┌─────────────┐     JWT Token      ┌──────────────────┐
│   前端 Vue   │ ─────────────────► │  blockchain-     │
│             │ ◄───────────────── │  service :8082   │
└─────────────┘                    └────────┬─────────┘
                                            │ 验证 JWT
                                            ▼
                                   ┌──────────────────┐
                                   │  CAS Server      │
                                   │  192.168.120.32  │
                                   │  (JWT 签发/验证)  │
                                   └──────────────────┘
                                            │
                              首次登录，触发账户绑定
                                            ▼
                                   ┌──────────────────┐
                                   │  WeBASE-Sign     │
                                   │  192.168.120.32  │
                                   │  (链上密钥托管)   │
                                   └──────────────────┘
                                            │ 返回链上地址
                                            ▼
                                   ┌──────────────────┐
                                   │  本地映射表       │
                                   │  cas_user_id      │
                                   │  → webase_address │
                                   │  → chain_role     │
                                   └──────────────────┘
```

**核心流程：**
1. 用户通过 CAS 登录，获得 JWT Token
2. JWT 中携带 `userId`、`username`、`role` 等字段
3. `blockchain-service` 验证 JWT，首次登录时调用 WeBASE-Sign 为该用户创建链上账户
4. 建立 `cas_user_id → webase_address` 映射，后续所有链上操作以此地址发起

---

## 2. 数据模型

### 2.1 用户账户映射表 `user_account_mapping`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT PK | 自增主键 |
| `cas_user_id` | VARCHAR(64) UNIQUE | CAS 用户唯一标识 |
| `cas_username` | VARCHAR(128) | CAS 用户名（冗余，便于查询） |
| `cas_role` | VARCHAR(32) | CAS 角色（bank/scenic_spot/market_maker/regulator/consumer） |
| `webase_user_id` | VARCHAR(64) | WeBASE-Sign 返回的 userId |
| `chain_address` | VARCHAR(42) | 链上地址（0x...） |
| `chain_role_hash` | VARCHAR(66) | 链上角色 keccak256 哈希 |
| `chain_role_granted` | BOOLEAN | 是否已在链上授权 |
| `created_at` | DATETIME | 创建时间 |
| `last_login_at` | DATETIME | 最近登录时间 |
| `status` | TINYINT | 0=禁用 1=正常 |

---

## 3. 接口设计

### 3.1 CAS 认证接口（blockchain-service 提供）

#### POST `/api/auth/login`
前端用 CAS 返回的 JWT 换取系统内部 token，同时触发账户绑定。

**Request Header:**
```
Authorization: Bearer <cas_jwt_token>
```

**Response 200:**
```json
{
  "userId": "cas_user_001",
  "username": "张三",
  "role": "scenic_spot",
  "chainAddress": "0x22a521c558d02200a255445d7e94ca9431d35ff9",
  "chainRoleGranted": true,
  "token": "<internal_jwt>",
  "expiresIn": 86400
}
```

**Response 401:**
```json
{
  "error": "invalid_token",
  "message": "CAS JWT 验证失败"
}
```

---

#### GET `/api/auth/me`
获取当前登录用户的账户信息（含链上地址）。

**Request Header:**
```
Authorization: Bearer <internal_jwt>
```

**Response 200:**
```json
{
  "userId": "cas_user_001",
  "username": "张三",
  "role": "scenic_spot",
  "chainAddress": "0x22a521c558d02200a255445d7e94ca9431d35ff9",
  "webaseUserId": "webase_u_001",
  "chainRoleGranted": true,
  "createdAt": "2026-03-18T10:00:00"
}
```

---

#### POST `/api/auth/logout`
登出，使 token 失效（加入黑名单）。

**Response 200:**
```json
{ "message": "已登出" }
```

---

### 3.2 WeBASE-Sign 代理接口（blockchain-service 提供）

blockchain-service 作为 WeBASE-Sign 的代理，前端/其他服务不直接调用 WeBASE-Sign。

#### POST `/api/sign/transaction`
用当前用户的链上账户对交易进行签名。

**Request:**
```json
{
  "contractAddress": "0x8fce611560492151fde78c8f1cebcd719ee42124",
  "encodedFunction": "0xabcdef...",
  "groupId": "group0"
}
```

**Response 200:**
```json
{
  "signedTransaction": "0xf86c...",
  "from": "0x22a521c558d02200a255445d7e94ca9431d35ff9"
}
```

---

#### GET `/api/sign/address`
查询当前用户的链上地址。

**Response 200:**
```json
{
  "chainAddress": "0x22a521c558d02200a255445d7e94ca9431d35ff9",
  "webaseUserId": "webase_u_001"
}
```

---

### 3.3 WeBASE-Sign 原生接口（blockchain-service 内部调用）

> WeBASE-Sign 部署在 `192.168.120.32`，端口待确认（默认 5004）。

#### POST `http://192.168.120.32:5004/WeBASE-Sign/user/newUser`
为 CAS 用户创建链上账户（首次登录时调用）。

**Request:**
```json
{
  "signUserId": "cas_user_001",
  "appId": "kxdex",
  "encryptType": 0
}
```

**Response:**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "signUserId": "cas_user_001",
    "address": "0x22a521c558d02200a255445d7e94ca9431d35ff9",
    "publicKey": "0x04..."
  }
}
```

---

#### POST `http://192.168.120.32:5004/WeBASE-Sign/sign`
对交易数据进行签名。

**Request:**
```json
{
  "signUserId": "cas_user_001",
  "encodedDataStr": "0xabcdef..."
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "signatureData": "0xf86c...",
    "v": "0x1b",
    "r": "0x...",
    "s": "0x..."
  }
}
```

---

#### GET `http://192.168.120.32:5004/WeBASE-Sign/user/{signUserId}/userInfo`
查询已有用户信息（用于校验映射是否存在）。

**Response:**
```json
{
  "code": 0,
  "data": {
    "signUserId": "cas_user_001",
    "address": "0x22a521c558d02200a255445d7e94ca9431d35ff9"
  }
}
```

---

## 4. 首次登录绑定流程

```
前端                blockchain-service           CAS Server        WeBASE-Sign        链上(Auth合约)
 │                        │                          │                  │                  │
 │  POST /api/auth/login  │                          │                  │                  │
 │  Bearer <cas_jwt>      │                          │                  │                  │
 │───────────────────────►│                          │                  │                  │
 │                        │  验证 JWT 签名/有效期     │                  │                  │
 │                        │─────────────────────────►│                  │                  │
 │                        │◄─────────────────────────│                  │                  │
 │                        │  解析 userId/role         │                  │                  │
 │                        │                          │                  │                  │
 │                        │  查询本地映射表                              │                  │
 │                        │  ── 不存在 ──────────────────────────────►  │                  │
 │                        │  POST /user/newUser       │                  │                  │
 │                        │◄─────────────────────────────────────────── │                  │
 │                        │  返回 chainAddress        │                  │                  │
 │                        │                          │                  │                  │
 │                        │  写入映射表               │                  │                  │
 │                        │  调用 Auth.grantRole()   │                  │                 ►│
 │                        │  (链上授权)               │                  │                  │
 │                        │                          │                  │                  │
 │                        │  签发内部 JWT             │                  │                  │
 │◄───────────────────────│                          │                  │                  │
 │  返回 token+chainAddr  │                          │                  │                  │
```

---

## 5. JWT 字段约定

### CAS 签发的 JWT（blockchain-service 验证）

| 字段 | 说明 |
|------|------|
| `sub` | CAS 用户唯一 ID |
| `username` | 用户名 |
| `role` | 角色（bank / scenic_spot / market_maker / regulator / consumer） |
| `iat` | 签发时间 |
| `exp` | 过期时间 |

### blockchain-service 签发的内部 JWT

| 字段 | 说明 |
|------|------|
| `sub` | CAS 用户 ID |
| `chainAddress` | 链上地址 |
| `role` | 角色 |
| `exp` | 过期时间（24h） |

---

## 6. 角色映射关系

| CAS role | 链上角色常量 | 权限说明 |
|----------|-------------|---------|
| `regulator` | `REGULATOR_ROLE` | 全局审计、授权管理 |
| `bank` | `BANK_ROLE` | 铸造/销毁 FiatToken |
| `exchange` | `EXCHANGE_ADMIN_ROLE` | 交易所管理 |
| `scenic_spot` | `SCENIC_OPERATOR_ROLE` | 发行门票 NFT |
| `market_maker` | `MARKET_MAKER_ROLE` | 做市挂单 |
| `consumer` | `CONSUMER_ROLE` | 购票/转让 |

---

## 7. 待确认事项

| 项目 | 状态 | 说明 |
|------|------|------|
| WeBASE-Sign 端口 | 待确认 | 默认 5004，需确认实际部署端口 |
| CAS JWT 公钥/密钥 | 待确认 | 需要 CAS 提供公钥用于验签 |
| WeBASE-Sign appId | 待确认 | 注册应用时分配 |
| 映射表存储位置 | 待确认 | 建议放在 blockchain-service 的 MySQL，或复用 matching-engine 的 DB |
| 链上授权执行账户 | 待确认 | grantRole 需要 REGULATOR_ROLE 账户，需配置管理员私钥 |
