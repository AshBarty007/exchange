package com.fisco.exchange.blockchain.controller;

import com.fisco.exchange.blockchain.client.FiscoBcosClient;
import com.fisco.exchange.blockchain.service.ContractService;
import org.fisco.bcos.sdk.v3.client.protocol.response.Peers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

/**
 * 区块链控制器
 */
@RestController
@RequestMapping("/api/blockchain")
public class BlockchainController {

    @Autowired
    private FiscoBcosClient fiscoBcosClient;

    @Autowired
    private ContractService contractService;

    @Value("${blockchain.custody.contract}")
    private String custodyContract;

    @Value("${blockchain.asset.token.contract}")
    private String assetTokenContract;

    @Value("${blockchain.nft.contract}")
    private String nftContract;

    @Value("${blockchain.nodes.rpc:}")
    private String nodesRpc;

    @Value("${blockchain.nodes.p2p:}")
    private String nodesP2p;

    private static final String[] NODE_NAMES = {"node0", "node1", "node2", "node3", "node4"};

    /**
     * 健康检查
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("service", "blockchain-service");
        return ResponseEntity.ok(response);
    }

    /**
     * 区块链综合状态 - 实时查询链上数据
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getBlockchainStatus() {
        Map<String, Object> response = new HashMap<>();
        try {
            long blockNumber = fiscoBcosClient.getBlockNumber();

            // 通过 Channel 协议 SDK 获取 peers 信息来判断节点在线状态
            String[] p2pAddrs = nodesP2p.isEmpty() ? new String[0] : nodesP2p.split(",");
            String[] rpcUrls = nodesRpc.isEmpty() ? new String[0] : nodesRpc.split(",");
            List<Peers.PeerInfo> peerList = fiscoBcosClient.getPeerList();
            List<String> peerNodeIds = new ArrayList<>();
            for (Peers.PeerInfo peer : peerList) {
                String nodeId = peer.getP2pNodeID();
                if (nodeId != null && !nodeId.trim().isEmpty()) {
                    peerNodeIds.add(nodeId);
                }
            }

            // 连接到 SDK 的节点本身也是在线的，peers 返回的是"其他"节点
            // 所以在线数 = peers数 + 1（自身）
            int configuredNodes = Math.max(p2pAddrs.length, rpcUrls.length);
            int discoveredNodes = peerList.size() + 1; // peers + self
            int totalNodes = Math.max(configuredNodes, discoveredNodes);
            int onlineCount = Math.min(discoveredNodes, totalNodes);

            List<Map<String, Object>> nodes = new ArrayList<>();
            for (int i = 0; i < totalNodes; i++) {
                Map<String, Object> node = new HashMap<>();
                String name = i < NODE_NAMES.length ? NODE_NAMES[i] : "node" + i;
                String rpc = i < rpcUrls.length ? rpcUrls[i].trim() : "";
                String p2p = i < p2pAddrs.length ? p2pAddrs[i].trim() : "";
                if (p2p.isEmpty() && i >= configuredNodes) {
                    int peerIndex = i - configuredNodes;
                    if (peerIndex >= 0 && peerIndex < peerNodeIds.size()) {
                        p2p = peerNodeIds.get(peerIndex);
                    }
                }
                node.put("name", name);
                node.put("rpc", rpc);
                node.put("p2p", p2p);
                // 如果能通过 SDK 获取到区块号，说明节点集群在线
                node.put("online", i < onlineCount);
                node.put("blockHeight", blockNumber);
                nodes.add(node);
            }

            response.put("blockNumber", blockNumber);
            response.put("nodeCount", totalNodes);
            response.put("onlineCount", onlineCount);
            response.put("sealerCount", fiscoBcosClient.getSealerCount());
            response.put("consensusStatus", "PBFT");
            response.put("txCount", fiscoBcosClient.getTotalTransactionCount());
            response.put("connected", true);
            response.put("nodes", nodes);
            response.put("groupId", 1);
            String ver = fiscoBcosClient.getNodeVersion();
            response.put("chainVersion", ver != null ? ver : "FISCO BCOS");
        } catch (Exception e) {
            response.put("blockNumber", 0);
            response.put("nodeCount", 0);
            response.put("onlineCount", 0);
            response.put("consensusStatus", "Unknown");
            response.put("txCount", 0);
            response.put("connected", false);
            response.put("nodes", List.of());
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 查询合约信息
     */
    @GetMapping("/contract/{address}")
    public ResponseEntity<Map<String, Object>> getContractInfo(@PathVariable String address) {
        Map<String, Object> response = new HashMap<>();
        response.put("address", address);
        response.put("connected", true);

        // 识别已知合约
        if (address.equalsIgnoreCase(custodyContract)) {
            response.put("name", "ExchangeCustody");
        } else if (address.equalsIgnoreCase(assetTokenContract)) {
            response.put("name", "AssetToken");
        } else if (address.equalsIgnoreCase(nftContract)) {
            response.put("name", "NFTTicket");
        } else {
            response.put("name", "Unknown Contract");
        }

        return ResponseEntity.ok(response);
    }

    /**
     * 获取最新区块号
     */
    @GetMapping("/block/latest")
    public ResponseEntity<Map<String, Object>> getLatestBlock() {
        long blockNumber = fiscoBcosClient.getBlockNumber();

        Map<String, Object> response = new HashMap<>();
        response.put("blockNumber", blockNumber);

        return ResponseEntity.ok(response);
    }

    /**
     * 获取区块详情（按区块号）
     */
    @GetMapping("/block/{blockNumber}")
    public ResponseEntity<?> getBlockByNumber(@PathVariable String blockNumber) {
        try {
            long num;
            if ("latest".equals(blockNumber)) {
                num = fiscoBcosClient.getBlockNumber();
            } else {
                num = Long.parseLong(blockNumber);
            }
            Map<String, Object> block = fiscoBcosClient.getBlockByNumber(num);
            if (block != null) {
                return ResponseEntity.ok(block);
            }
            return ResponseEntity.ok(Map.of("error", "Block not found", "blockNumber", num));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("error", e.getMessage()));
        }
    }

    /**
     * 获取最新两个区块的详情
     */
    @GetMapping({"/blocks/recent", "/blocks", "/blocks/"})
    public ResponseEntity<Map<String, Object>> getRecentBlocks() {
        Map<String, Object> response = new HashMap<>();
        try {
            long latest = fiscoBcosClient.getBlockNumber();
            Map<String, Object> currentBlock = fiscoBcosClient.getBlockByNumber(latest);
            response.put("current", currentBlock);
            response.put("currentNumber", latest);

            if (latest > 0) {
                Map<String, Object> prevBlock = fiscoBcosClient.getBlockByNumber(latest - 1);
                response.put("previous", prevBlock);
                response.put("previousNumber", latest - 1);
            }
            response.put("connected", true);
        } catch (Exception e) {
            response.put("connected", false);
            response.put("error", e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    /**
     * 获取交易回执 - 兼容 /tx/ 和 /transaction/ 两种路径
     */
    @GetMapping({"/tx/{txHash}", "/transaction/{txHash}"})
    public ResponseEntity<FiscoBcosClient.TransactionReceiptDTO> getTransactionReceipt(
        @PathVariable String txHash
    ) {
        FiscoBcosClient.TransactionReceiptDTO receipt = fiscoBcosClient.getTransactionReceipt(txHash);
        return ResponseEntity.ok(receipt);
    }

    /**
     * 批量铸造NFT门票
     */
    @PostMapping("/nft/batch-mint")
    public ResponseEntity<Map<String, String>> batchMintTickets(
        @RequestBody Map<String, Object> request
    ) {
        String ticketType = (String) request.get("ticketType");
        BigDecimal price = new BigDecimal(request.get("price").toString());
        long validUntil = Long.parseLong(request.get("validUntil").toString());
        int count = Integer.parseInt(request.get("count").toString());

        String txHash = contractService.batchMintTickets(ticketType, price, validUntil, count);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Batch mint initiated");
        response.put("txHash", txHash);

        return ResponseEntity.ok(response);
    }

    /**
     * 提交存款证明
     */
    @PostMapping("/asset/deposit-proof")
    public ResponseEntity<Map<String, String>> submitDepositProof(
        @RequestBody Map<String, Object> request
    ) {
        String marketMakerAddress = (String) request.get("marketMakerAddress");
        BigDecimal amount = new BigDecimal(request.get("amount").toString());
        String proofHash = (String) request.get("proofHash");

        String txHash = contractService.submitDepositProof(marketMakerAddress, amount, proofHash);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Deposit proof submitted");
        response.put("txHash", txHash);

        return ResponseEntity.ok(response);
    }

    /**
     * 铸造资金凭证
     */
    @PostMapping("/asset/mint")
    public ResponseEntity<Map<String, String>> mintAssetToken(
        @RequestBody Map<String, String> request
    ) {
        String proofId = request.get("proofId");

        String txHash = contractService.mintAssetToken(proofId);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Asset token minted");
        response.put("txHash", txHash);

        return ResponseEntity.ok(response);
    }

    /**
     * 查询代币余额
     */
    @GetMapping("/asset/balance/{address}")
    public ResponseEntity<Map<String, Object>> getTokenBalance(
        @PathVariable String address
    ) {
        BigDecimal balance = contractService.getTokenBalance(address);

        Map<String, Object> response = new HashMap<>();
        response.put("address", address);
        response.put("balance", balance.toString());

        return ResponseEntity.ok(response);
    }

    /**
     * 查询NFT持有
     */
    @GetMapping("/nft/tokens/{address}")
    public ResponseEntity<Map<String, Object>> getNFTTokens(
        @PathVariable String address
    ) {
        List<Long> tokenIds = contractService.getNFTTokens(address);

        Map<String, Object> response = new HashMap<>();
        response.put("address", address);
        response.put("tokenIds", tokenIds);
        response.put("count", tokenIds.size());

        return ResponseEntity.ok(response);
    }

    /**
     * 授予链上角色
     */
    @PostMapping("/auth/grant-role")
    public ResponseEntity<Map<String, String>> grantRole(@RequestBody Map<String, String> request) {
        String walletAddress = request.get("walletAddress");
        String role = request.get("role");
        Map<String, String> response = new HashMap<>();
        try {
            String txHash = contractService.grantRole(walletAddress, role);
            response.put("message", "Role granted on-chain");
            response.put("txHash", txHash);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            response.put("error", "Failed to grant role: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * 获取所有合约地址（系统设置用）
     */
    @GetMapping("/contracts")
    public ResponseEntity<Map<String, Object>> getContractAddresses() {
        Map<String, Object> response = new HashMap<>();
        response.put("contracts", contractService.getContractAddresses());
        return ResponseEntity.ok(response);
    }

    /**
     * 提取资金凭证到银行
     */
    @PostMapping("/asset/withdraw")
    public ResponseEntity<Map<String, String>> withdrawToBank(
        @RequestBody Map<String, Object> request
    ) {
        String userAddress = (String) request.get("userAddress");
        BigDecimal amount = new BigDecimal(request.get("amount").toString());
        String bankAddress = (String) request.get("bankAddress");

        String txHash = contractService.withdrawToBank(userAddress, amount, bankAddress);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Withdraw initiated");
        response.put("txHash", txHash);

        return ResponseEntity.ok(response);
    }
}
