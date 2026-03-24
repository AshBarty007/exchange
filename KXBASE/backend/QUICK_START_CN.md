# wallet-dapp Java 后端快速说明（FISCO Java SDK）

## 1. 目标

本次改造已将 `wallet-dapp` 的链上调用主链路改为：

`React 前端 -> Java Spring Boot 后端 -> FISCO BCOS Java SDK -> 区块链`

并新增：
- 资产页「合约交互可视化」
- 法币铸造页面（银行角色）
- 测试钱包（PEM）导入能力
- 后端合约编译接口（调用 console 的 `contract2java.sh`）

---

## 2. 目录结构

- 后端工程：`wallet-dapp/backend`
- 前端工程：`wallet-dapp`
- 合约目录：`contracts`
- 合约地址配置：`config/deployed-contracts.json`

---

## 3. 本地启动步骤

### 3.1 启动 Java 后端

```bash
cd wallet-dapp/backend
export JAVA_HOME=/path/to/jdk-11
mvn spring-boot:run
```

默认端口：`9090`

说明：
- 后端已在启动类内自动设置 `jdk.tls.namedGroups=secp256k1`，避免 Java 11 + FISCO SDK 的 TLS 兼容问题。
- 若仍报 websocket handshake timeout，请检查节点是否正常、`peers`/`cert-path`/`group` 是否与本地链一致。

后端配置文件：`wallet-dapp/backend/src/main/resources/application.yml`

关键配置：
- `kx.fisco.peers`
- `kx.fisco.group`
- `kx.fisco.cert-path`
- `kx.fisco.contracts-file`
- `kx.fisco.test-wallet-dir`
- `kx.fisco.console-dir`

证书目录建议：
- 本地开发环境：`/Users/hqsk/Work/kxnode/nodes/127.0.0.1/sdk`
- 服务器环境：`/home/hqsk/fisco/nodes/127.0.0.1/sdk`
- 若你已同步到 console，也可用：
  - 本地：`/Users/hqsk/Work/kxnode/console/conf`
  - 服务器：`/home/hqsk/fisco/console/conf`

### 3.2 启动前端

```bash
cd wallet-dapp
npm install
npm run dev
```

默认前端端口：`4000`

Vite 已配置代理：
- `/backend-api -> http://127.0.0.1:9090`

---

## 4. 切换到服务器时需要修改

服务器路径配置：
- 项目根目录：`/home/hqsk/kxdex`
- FISCO 根目录：`/home/hqsk/fisco`

请在 `application.yml` 修改为：

```yaml
kx:
  fisco:
    cert-path: /home/hqsk/fisco/nodes/127.0.0.1/sdk
    test-wallet-dir: /home/hqsk/fisco/console/accounts
    console-dir: /home/hqsk/fisco/console
    contracts-file: /home/hqsk/fisco/console/deployment_info.json
```

如果节点地址不同，也要同步修改 `peers`。

---

## 5. 合约编译（Java 后端触发）

后端提供接口：

- `POST /api/v1/contracts/compile`

默认内部执行：

```bash
./contract2java.sh solidity -s <contractsPath> -o <outputPath> -p <packageName> -t 2
```

你也可以直接在 console 路径手工执行：

### 本地

```bash
cd /Users/hqsk/Work/kxnode/console
./contract2java.sh solidity -s /Users/hqsk/Work/kxdex/kxdex/contracts -o /Users/hqsk/Work/kxdex/kxdex/wallet-dapp/backend/target/generated-contracts -p com.kxdex.wallet.backend.contracts -t 2
```

### 服务器

```bash
cd /home/hqsk/fisco/console
./contract2java.sh solidity -s /home/hqsk/kxdex/contracts -o /home/hqsk/kxdex/wallet-dapp/backend/target/generated-contracts -p com.kxdex.wallet.backend.contracts -t 2
```

---

## 6. 测试钱包流程（get_account.sh）

### 6.1 生成测试钱包

本地：

```bash
cd /Users/hqsk/Work/kxnode/console
./get_account.sh
```

服务器：

```bash
cd /home/hqsk/fisco/console
./get_account.sh
```

生成后的 `.pem` 在 `accounts/`。

### 6.2 前端导入

- 打开「钱包管理」页面
- 点击「导入测试钱包」
- 前端会调用后端 `GET /api/v1/wallets/test-wallets`
- 自动导入地址/私钥到当前前端钱包列表

---

## 7. 典型测试流程

1. 钱包管理 -> 导入测试钱包
2. 系统设置 -> 填写合约地址（或加载部署文件）
3. 资产管理 -> 充值/提现/转账
4. 观察资产页下方「资产操作合约交互」面板（请求参数 + 链上返回）
5. 法币铸造 -> 银行角色向目标地址 mint
6. 观察「法币铸造合约交互」面板

---

## 8. 已验证项与注意事项

- 前端构建已通过：`npm run build`
- 后端已调整为 Java 11 兼容（Spring Boot 2.7.x）
- 你在本地/服务器编译后端前，请先确认 `java -version` 为 11（或更高且目标兼容 11）
- 若 `mvn spring-boot:run`/`console.sh` 都报 `The websocket connection handshake timeout`：
  - 先确认节点进程监听中（如 `20200/20201`）
  - 检查证书是否来自同一套 CA（`ca.crt/sdk.crt/sdk.key` 哈希一致）
  - 用 `curl -k --cert sdk.crt --key sdk.key https://<peer>` 验证节点 RPC 是否可返回数据
