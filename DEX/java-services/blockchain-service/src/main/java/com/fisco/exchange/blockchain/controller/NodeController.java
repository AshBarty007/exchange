package com.fisco.exchange.blockchain.controller;

import com.fisco.exchange.blockchain.client.FiscoBcosClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * 节点管理控制器 - 提供各角色节点的状态和业务数据
 */
@RestController
@RequestMapping("/api/nodes")
public class NodeController {

    private final Random random = new Random();
    private static final String[] NODE_LABELS = {"景区节点", "交易所节点", "做市商节点", "银行节点", "监管节点"};
    private static final String[] NODE_TYPES = {"scenic_spot", "exchange", "market_maker", "bank", "regulator"};

    @Autowired
    private FiscoBcosClient fiscoBcosClient;

    @Value("${blockchain.nodes.rpc:}")
    private String nodesRpc;

    @Value("${blockchain.nodes.p2p:}")
    private String nodesP2p;

    @GetMapping("/{nodeType}/status")
    public ResponseEntity<Map<String, Object>> getNodeStatus(@PathVariable String nodeType) {
        Map<String, Object> status = new HashMap<>();
        status.put("nodeType", nodeType);
        status.put("online", true);
        status.put("blockHeight", 12345 + random.nextInt(100));
        status.put("peers", "regulator".equals(nodeType) ? 4 : 3);
        status.put("consensusStatus", "PBFT");
        status.put("pendingTx", random.nextInt(10));
        status.put("uptime", "72h 35m");
        status.put("version", "FISCO BCOS v3.6.0");
        return ResponseEntity.ok(status);
    }

    @GetMapping("/{nodeType}/metrics")
    public ResponseEntity<Map<String, Object>> getNodeMetrics(@PathVariable String nodeType) {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("tps", generateTimeSeries(30, 120, 40));
        metrics.put("blockTime", generateTimeSeries(30, 1.5, 0.5));
        metrics.put("latency", generateTimeSeries(30, 50, 20));
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/{nodeType}/transactions")
    public ResponseEntity<List<Map<String, Object>>> getRecentTransactions(
            @PathVariable String nodeType,
            @RequestParam(defaultValue = "15") int limit) {
        Map<String, String[]> txTypes = new HashMap<>();
        txTypes.put("scenic_spot", new String[]{"NFT铸造", "NFT转让", "门票验证", "门票退款"});
        txTypes.put("market_maker", new String[]{"挂单", "撤单", "撮合成交", "价格更新"});
        txTypes.put("bank", new String[]{"凭证铸造", "凭证销毁", "存款证明", "提现处理"});
        txTypes.put("regulator", new String[]{"审计查询", "合规检查", "告警处理", "节点审查"});

        String[] types = txTypes.getOrDefault(nodeType, txTypes.get("regulator"));
        List<Map<String, Object>> transactions = new ArrayList<>();
        for (int i = 0; i < limit; i++) {
            Map<String, Object> tx = new HashMap<>();
            tx.put("txHash", "0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 12) + "...");
            tx.put("type", types[random.nextInt(types.length)]);
            tx.put("from", "0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) + "...");
            tx.put("to", "0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) + "...");
            tx.put("blockNumber", 12345 - i);
            tx.put("timestamp", new Date(System.currentTimeMillis() - (long) i * 60000).toString());
            tx.put("status", random.nextDouble() > 0.05 ? "成功" : "失败");
            transactions.add(tx);
        }
        return ResponseEntity.ok(transactions);
    }

    @GetMapping("/scenic_spot/tickets")
    public ResponseEntity<Map<String, Object>> getScenicSpotData() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalTickets", 15680);
        data.put("ticketTypes", 8);
        data.put("soldTickets", 12340);
        data.put("revenue", 2468000);

        List<Map<String, Object>> ticketsByType = new ArrayList<>();
        String[][] ticketInfo = {
            {"普通门票", "5000", "4200"}, {"VIP门票", "2000", "1800"},
            {"年卡", "1000", "850"}, {"学生票", "3000", "2500"},
            {"团体票", "2680", "1990"}, {"夜场票", "1000", "600"},
            {"节假日票", "800", "300"}, {"体验票", "200", "100"}
        };
        for (String[] info : ticketInfo) {
            Map<String, Object> ticket = new HashMap<>();
            ticket.put("name", info[0]);
            ticket.put("issued", Integer.parseInt(info[1]));
            ticket.put("sold", Integer.parseInt(info[2]));
            ticketsByType.add(ticket);
        }
        data.put("ticketsByType", ticketsByType);

        List<Map<String, Object>> statusDist = new ArrayList<>();
        statusDist.add(Map.of("name", "可用", "value", 3340, "color", "#52c41a"));
        statusDist.add(Map.of("name", "已售", "value", 12340, "color", "#1890ff"));
        statusDist.add(Map.of("name", "已过期", "value", 0, "color", "#ff4d4f"));
        data.put("statusDistribution", statusDist);

        return ResponseEntity.ok(data);
    }

    @GetMapping("/market_maker/orders")
    public ResponseEntity<Map<String, Object>> getMarketMakerData() {
        Map<String, Object> data = new HashMap<>();
        data.put("activeOrders", 256);
        data.put("matchRate", 87.5);
        data.put("totalVolume", 1580000);
        data.put("currentSpread", 0.35);

        List<Map<String, Object>> orderTrend = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            Map<String, Object> point = new HashMap<>();
            point.put("time", String.format("%02d:00", i + 1));
            point.put("buyOrders", 80 + random.nextInt(60));
            point.put("sellOrders", 70 + random.nextInt(50));
            orderTrend.add(point);
        }
        data.put("orderTrend", orderTrend);

        List<Map<String, Object>> spreadHistory = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            Map<String, Object> point = new HashMap<>();
            point.put("time", String.format("%02d:00", i + 1));
            point.put("spread", Math.round((0.2 + random.nextDouble() * 0.3) * 100.0) / 100.0);
            spreadHistory.add(point);
        }
        data.put("spreadHistory", spreadHistory);

        List<Map<String, Object>> currentOrders = new ArrayList<>();
        String[] statuses = {"挂单中", "部分成交"};
        for (int i = 0; i < 10; i++) {
            Map<String, Object> order = new HashMap<>();
            order.put("id", "ORD-" + (1000 + i));
            order.put("side", i % 2 == 0 ? "买入" : "卖出");
            order.put("price", Math.round((100 + (random.nextDouble() - 0.5) * 10) * 100.0) / 100.0);
            order.put("quantity", 10 + random.nextInt(90));
            order.put("filled", random.nextInt(50));
            order.put("status", statuses[random.nextInt(statuses.length)]);
            currentOrders.add(order);
        }
        data.put("currentOrders", currentOrders);

        return ResponseEntity.ok(data);
    }

    @GetMapping("/bank/assets")
    public ResponseEntity<Map<String, Object>> getBankData() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalMinted", 8500000);
        data.put("pendingProofs", 12);
        data.put("custodyAccounts", 45);
        data.put("custodyValue", 25600000);

        List<Map<String, Object>> dailyMintBurn = new ArrayList<>();
        for (int i = 0; i < 14; i++) {
            Map<String, Object> point = new HashMap<>();
            point.put("date", (i + 1) + "日");
            point.put("minted", 50000 + random.nextInt(100000));
            point.put("burned", 20000 + random.nextInt(60000));
            dailyMintBurn.add(point);
        }
        data.put("dailyMintBurn", dailyMintBurn);

        List<Map<String, Object>> supplyTrend = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            Map<String, Object> point = new HashMap<>();
            point.put("date", (i + 1) + "日");
            point.put("supply", 7000000 + i * 50000 + random.nextInt(30000));
            supplyTrend.add(point);
        }
        data.put("supplyTrend", supplyTrend);

        List<Map<String, Object>> recentProofs = new ArrayList<>();
        String[] proofStatuses = {"待审核", "已通过", "已铸造"};
        for (int i = 0; i < 8; i++) {
            Map<String, Object> proof = new HashMap<>();
            proof.put("id", "PROOF-" + (2000 + i));
            proof.put("depositor", "0x" + UUID.randomUUID().toString().replace("-", "").substring(0, 8) + "...");
            proof.put("amount", 100000 + random.nextInt(500000));
            proof.put("status", proofStatuses[random.nextInt(proofStatuses.length)]);
            proof.put("timestamp", new Date(System.currentTimeMillis() - (long) i * 3600000).toString());
            recentProofs.add(proof);
        }
        data.put("recentProofs", recentProofs);

        return ResponseEntity.ok(data);
    }

    @GetMapping("/regulator/overview")
    public ResponseEntity<Map<String, Object>> getRegulatorData() {
        Map<String, Object> data = new HashMap<>();
        data.put("totalNodes", 5);
        data.put("totalTransactions", 56789);
        data.put("alertCount", 3);
        data.put("complianceScore", 96.8);

        List<Map<String, Object>> nodeOverview = new ArrayList<>();
        String[] rpcUrls = splitCsv(nodesRpc);
        String[] p2pAddrs = splitCsv(nodesP2p);

        int configuredNodes = Math.max(rpcUrls.length, p2pAddrs.length);
        int totalNodes = configuredNodes;
        long blockNumber = 12345;
        long totalTransactions = 56789;
        int discoveredNodes = totalNodes > 0 ? totalNodes : 5;
        int onlineCount = totalNodes > 0 ? totalNodes : 5;

        try {
            blockNumber = fiscoBcosClient.getBlockNumber();
            totalTransactions = fiscoBcosClient.getTotalTransactionCount();
            int peerCount = fiscoBcosClient.getPeerList().size();
            discoveredNodes = peerCount + 1;
        } catch (Exception ignored) {
            // Keep fallback values when blockchain is temporarily unavailable.
        }

        if (totalNodes <= 0) {
            totalNodes = NODE_LABELS.length;
        }
        totalNodes = Math.max(totalNodes, discoveredNodes);
        onlineCount = Math.min(discoveredNodes, totalNodes);

        long txPerNode = totalNodes > 0 ? totalTransactions / totalNodes : 0;
        for (int i = 0; i < totalNodes; i++) {
            Map<String, Object> n = new HashMap<>();
            n.put("name", i < NODE_LABELS.length ? NODE_LABELS[i] : "扩展节点" + (i - NODE_LABELS.length + 1));
            n.put("type", i < NODE_TYPES.length ? NODE_TYPES[i] : "node_" + i);
            n.put("online", i < onlineCount);
            n.put("blockHeight", blockNumber);
            n.put("txCount", txPerNode);
            n.put("p2p", i < p2pAddrs.length ? p2pAddrs[i].trim() : "");
            n.put("rpc", i < rpcUrls.length ? rpcUrls[i].trim() : "");
            nodeOverview.add(n);
        }

        data.put("totalNodes", totalNodes);
        data.put("totalTransactions", totalTransactions);
        data.put("nodeOverview", nodeOverview);
        data.put("networkTps", generateTimeSeries(30, 480, 100));

        List<Map<String, Object>> txByType = new ArrayList<>();
        String[][] txInfo = {
            {"NFT铸造/转让", "15680"}, {"订单撮合", "18920"},
            {"凭证铸造/销毁", "12450"}, {"存款证明", "5200"}, {"审计查询", "4539"}
        };
        for (String[] info : txInfo) {
            txByType.add(Map.of("type", info[0], "count", Integer.parseInt(info[1])));
        }
        data.put("txByType", txByType);

        List<Map<String, Object>> alerts = new ArrayList<>();
        alerts.add(Map.of("id", 1, "level", "警告", "message", "做市商节点交易量异常增加 (+150%)", "time", "10分钟前", "resolved", false));
        alerts.add(Map.of("id", 2, "level", "提示", "message", "银行节点存款证明待处理数量超过阈值", "time", "25分钟前", "resolved", false));
        alerts.add(Map.of("id", 3, "level", "严重", "message", "检测到异常大额转账: 500,000 Token", "time", "1小时前", "resolved", false));
        data.put("alerts", alerts);

        List<Map<String, Object>> auditLog = new ArrayList<>();
        String[] actions = {"交易审计", "节点检查", "合规验证", "告警处理", "权限变更"};
        String[] targets = {"景点节点", "做市商节点", "银行节点", "全网"};
        for (int i = 0; i < 20; i++) {
            Map<String, Object> log = new HashMap<>();
            log.put("id", "AUDIT-" + (3000 + i));
            log.put("action", actions[random.nextInt(actions.length)]);
            log.put("operator", "监管员" + (random.nextInt(3) + 1));
            log.put("target", targets[random.nextInt(targets.length)]);
            log.put("result", random.nextDouble() > 0.1 ? "通过" : "异常");
            log.put("timestamp", new Date(System.currentTimeMillis() - (long) i * 1800000).toString());
            auditLog.add(log);
        }
        data.put("auditLog", auditLog);

        return ResponseEntity.ok(data);
    }

    private String[] splitCsv(String input) {
        if (input == null || input.trim().isEmpty()) {
            return new String[0];
        }
        return Arrays.stream(input.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .toArray(String[]::new);
    }

    private List<Map<String, Object>> generateTimeSeries(int points, double baseValue, double variance) {
        List<Map<String, Object>> series = new ArrayList<>();
        long now = System.currentTimeMillis();
        for (int i = 0; i < points; i++) {
            Map<String, Object> point = new HashMap<>();
            point.put("time", new Date(now - (long)(points - i) * 10000).toString());
            point.put("value", Math.max(0, baseValue + (random.nextDouble() - 0.5) * variance * 2));
            series.add(point);
        }
        return series;
    }
}
