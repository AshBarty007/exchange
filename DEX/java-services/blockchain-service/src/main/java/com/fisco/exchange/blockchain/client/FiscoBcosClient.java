package com.fisco.exchange.blockchain.client;

import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.client.protocol.response.*;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.math.BigInteger;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * FISCO BCOS 3.11 区块链客户端
 * 连接本地 node5 + 远程服务器节点
 */
@Component
public class FiscoBcosClient {

    @Autowired
    @Lazy
    private Client client;

    private final Map<String, String> abiCache = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        System.out.println("FiscoBcosClient initialized - FISCO BCOS 3.11");
    }

    /**
     * 获取最新区块号
     */
    public long getBlockNumber() {
        try {
            BlockNumber result = client.getBlockNumber();
            return result.getBlockNumber().longValue();
        } catch (Exception e) {
            System.err.println("getBlockNumber failed: " + e.getMessage());
            return 0;
        }
    }

    /**
     * 获取交易回执
     */
    public TransactionReceiptDTO getTransactionReceipt(String txHash) {
        TransactionReceiptDTO dto = new TransactionReceiptDTO();
        try {
            // SDK 3.6.0: getTransactionReceipt(txHash, withProof)
            BcosTransactionReceipt result = client.getTransactionReceipt(txHash, false);
            TransactionReceipt receipt = result.getTransactionReceipt();
            if (receipt != null) {
                dto.setTxHash(receipt.getTransactionHash());
                dto.setBlockHash(receipt.getReceiptHash());
                BigInteger blockNum = receipt.getBlockNumber();
                if (blockNum != null) {
                    dto.setBlockNumber(blockNum.longValue());
                }
                dto.setStatus(receipt.getStatus());
                dto.setOutput(receipt.getOutput());
            }
        } catch (Exception e) {
            System.err.println("getTransactionReceipt failed: " + e.getMessage());
        }
        return dto;
    }

    /**
     * 调用合约方法（只读 call）- 合约地址为零地址，暂不实际调用
     */
    public String callContract(String contractAddress, String functionName, Object... params) {
        System.out.println("callContract to " + contractAddress + "." + functionName + " (not implemented yet)");
        return "";
    }

    /**
     * 发送交易 - 合约地址为零地址，暂不实际调用
     */
    public String sendTransaction(String contractAddress, String functionName, Object... params) {
        System.out.println("sendTransaction to " + contractAddress + "." + functionName + " (not implemented yet)");
        return "0x" + Long.toHexString(System.currentTimeMillis()) + "0000000000000000";
    }

    /**
     * 获取节点版本 - SDK 3.6.0 没有 getNodeVersion，返回固定值
     */
    public String getNodeVersion() {
        try {
            // SDK 3.6.0 removed getNodeVersion, use getBlockNumber as health check
            long blockNum = client.getBlockNumber().getBlockNumber().longValue();
            return "FISCO BCOS 3.x (block: " + blockNum + ")";
        } catch (Exception e) {
            System.err.println("getNodeVersion failed: " + e.getMessage());
            return "Unknown";
        }
    }

    /**
     * 获取节点 Peers 数量
     */
    public int getPeerCount() {
        try {
            Peers result = client.getPeers();
            Peers.PeersInfo peersInfo = result.getPeers();
            if (peersInfo != null && peersInfo.getPeers() != null) {
                return peersInfo.getPeers().size();
            }
            return 0;
        } catch (Exception e) {
            System.err.println("getPeers failed: " + e.getMessage());
            return 0;
        }
    }

    /**
     * 获取 Peers 列表（用于节点在线检测）
     */
    public List<Peers.PeerInfo> getPeerList() {
        try {
            Peers result = client.getPeers();
            Peers.PeersInfo peersInfo = result.getPeers();
            if (peersInfo != null && peersInfo.getPeers() != null) {
                return peersInfo.getPeers();
            }
            return Collections.emptyList();
        } catch (Exception e) {
            System.err.println("getPeers failed: " + e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * 获取交易总数
     */
    public long getTotalTransactionCount() {
        try {
            TotalTransactionCount result = client.getTotalTransactionCount();
            TotalTransactionCount.TransactionCountInfo info = result.getTotalTransactionCount();
            String txCount = info.getTransactionCount();
            if (txCount != null && txCount.startsWith("0x")) {
                return Long.parseLong(txCount.substring(2), 16);
            }
            return Long.parseLong(txCount);
        } catch (Exception e) {
            System.err.println("getTotalTransactionCount failed: " + e.getMessage());
            return 0;
        }
    }

    /**
     * 获取共识状态
     */
    public String getConsensusStatus() {
        try {
            ConsensusStatus result = client.getConsensusStatus();
            if (result != null) {
                return "PBFT";
            }
        } catch (Exception e) {
            System.err.println("getConsensusStatus failed: " + e.getMessage());
        }
        return "Unknown";
    }

    /**
     * 获取 Sealer 列表（共识节点）数量
     */
    public int getSealerCount() {
        try {
            SealerList result = client.getSealerList();
            return result.getSealerList().size();
        } catch (Exception e) {
            System.err.println("getSealerList failed: " + e.getMessage());
            return 0;
        }
    }

    /**
     * 注册合约 ABI
     */
    public void registerAbi(String contractAddress, String contractName) {
        abiCache.put(contractAddress, contractName);
    }

    /**
     * 获取区块详情
     */
    public Map<String, Object> getBlockByNumber(long blockNumber) {
        try {
            // SDK 3.6.0: getBlockByNumber(blockNumber, onlyHeader, onlyTxHash)
            BcosBlock result = client.getBlockByNumber(BigInteger.valueOf(blockNumber), false, false);
            BcosBlock.Block block = result.getBlock();
            if (block == null) return null;

            Map<String, Object> parsed = new LinkedHashMap<>();
            parsed.put("number", block.getNumber());
            parsed.put("hash", block.getHash());

            // SDK 3.6.0: parentInfo instead of parentHash
            List<BcosBlockHeader.ParentInfo> parentInfo = block.getParentInfo();
            if (parentInfo != null && !parentInfo.isEmpty()) {
                parsed.put("parentHash", parentInfo.get(0).getBlockHash());
            } else {
                parsed.put("parentHash", "");
            }

            parsed.put("sealer", block.getSealer());
            parsed.put("gasUsed", block.getGasUsed());
            parsed.put("transactionsRoot", block.getTransactionsRoot());
            parsed.put("stateRoot", block.getStateRoot());
            parsed.put("receiptsRoot", block.getReceiptsRoot());

            // SDK 3.6.0: timestamp is long, not hex string
            parsed.put("timestamp", block.getTimestamp());

            // 交易列表
            List<BcosBlock.TransactionResult> txResults = block.getTransactions();
            if (txResults != null) {
                parsed.put("txCount", txResults.size());
                List<Map<String, Object>> simpleTxs = new ArrayList<>();
                for (BcosBlock.TransactionResult txResult : txResults) {
                    if (txResult instanceof BcosBlock.TransactionObject) {
                        BcosBlock.TransactionObject txObj = (BcosBlock.TransactionObject) txResult;
                        Map<String, Object> simpleTx = new LinkedHashMap<>();
                        simpleTx.put("hash", txObj.getHash());
                        simpleTx.put("from", txObj.getFrom());
                        simpleTx.put("to", txObj.getTo());
                        simpleTx.put("input", txObj.getInput());
                        simpleTx.put("nonce", txObj.getNonce());
                        simpleTx.put("importTime", txObj.getImportTime());
                        // SDK 3.6.0 uses getChainID/getGroupID
                        simpleTx.put("chainId", txObj.getChainID());
                        simpleTx.put("groupId", txObj.getGroupID());
                        // 识别已知合约名称
                        String toAddr = txObj.getTo();
                        if (toAddr != null && abiCache.containsKey(toAddr)) {
                            simpleTx.put("contractName", abiCache.get(toAddr));
                        }
                        simpleTxs.add(simpleTx);
                    }
                }
                parsed.put("transactions", simpleTxs);
            } else {
                parsed.put("txCount", 0);
                parsed.put("transactions", Collections.emptyList());
            }

            // 签名列表
            List<BcosBlockHeader.Signature> sigs = block.getSignatureList();
            parsed.put("signatureCount", sigs != null ? sigs.size() : 0);

            return parsed;
        } catch (Exception e) {
            System.err.println("getBlockByNumber failed: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private String truncate(String s, int len) {
        if (s == null) return "";
        if (s.length() <= len) return s;
        return s.substring(0, len) + "...";
    }

    // DTO classes

    public static class TransactionReceiptDTO {
        private String txHash;
        private String blockHash;
        private long blockNumber;
        private int status;
        private String output;

        public String getTxHash() { return txHash; }
        public void setTxHash(String txHash) { this.txHash = txHash; }
        public String getBlockHash() { return blockHash; }
        public void setBlockHash(String blockHash) { this.blockHash = blockHash; }
        public long getBlockNumber() { return blockNumber; }
        public void setBlockNumber(long blockNumber) { this.blockNumber = blockNumber; }
        public int getStatus() { return status; }
        public void setStatus(int status) { this.status = status; }
        public String getOutput() { return output; }
        public void setOutput(String output) { this.output = output; }
        public boolean isSuccess() { return status == 0; }
    }

    public static class ContractCall {
        private String contractAddress;
        private String functionName;
        private Object[] params;

        public ContractCall(String contractAddress, String functionName, Object... params) {
            this.contractAddress = contractAddress;
            this.functionName = functionName;
            this.params = params;
        }

        public String getContractAddress() { return contractAddress; }
        public String getFunctionName() { return functionName; }
        public Object[] getParams() { return params; }
    }
}
