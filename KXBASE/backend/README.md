# KXDEX wallet-dapp Backend

Spring Boot + FISCO BCOS Java SDK backend for contract calls, transactions, block queries and test wallet integration.

## Main APIs

- `GET /api/v1/system/health`
- `GET /api/v1/system/version`
- `GET /api/v1/blockchain/block-number`
- `GET /api/v1/blockchain/blocks`
- `GET /api/v1/blockchain/blocks/{number}`
- `GET /api/v1/blockchain/transactions/{txHash}/receipt`
- `GET /api/v1/contracts/addresses`
- `POST /api/v1/contracts/addresses/reload`
- `POST /api/v1/contracts/call`
- `POST /api/v1/contracts/send`
- `POST /api/v1/contracts/compile`
- `GET /api/v1/wallets/test-wallets`
- `POST /api/v1/wallets/generate`

## Run

```bash
cd wallet-dapp/backend
export JAVA_HOME=/path/to/jdk-11
mvn spring-boot:run
```

Note:
- The backend auto-sets `jdk.tls.namedGroups=secp256k1` for Java 11 startup compatibility with FISCO SDK.
- Default local cert path is `nodes/127.0.0.1/sdk` (same cert set as console `conf`).
- If startup reports websocket handshake timeout, check node status and `application.yml` values (`peers`, `cert-path`, `group`).

See `QUICK_START_CN.md` for local/server path migration notes.
