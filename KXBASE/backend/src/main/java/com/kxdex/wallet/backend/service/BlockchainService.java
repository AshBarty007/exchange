package com.kxdex.wallet.backend.service;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.client.protocol.response.BcosBlock;
import org.fisco.bcos.sdk.v3.client.protocol.response.BcosTransactionReceipt;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kxdex.wallet.backend.util.ContractTypeConverter;

@Service
public class BlockchainService {

    private final Client client;
    private final ObjectMapper objectMapper;

    public BlockchainService(Client client, ObjectMapper objectMapper) {
        this.client = client;
        this.objectMapper = objectMapper;
    }

    public BigInteger getBlockNumber() {
        return client.getBlockNumber().getBlockNumber();
    }

    public Map<String, Object> getBlockByNumber(long blockNumber, boolean fullTransactions) {
        BcosBlock response = client.getBlockByNumber(BigInteger.valueOf(blockNumber), fullTransactions, false);
        if (response == null || response.getBlock() == null) {
            throw new IllegalArgumentException("Block not found: " + blockNumber);
        }
        return normalizeBlock(response.getBlock());
    }

    public List<Map<String, Object>> getRecentBlocks(int limit, boolean fullTransactions) {
        int effectiveLimit = Math.max(1, Math.min(limit, 50));
        BigInteger latest = getBlockNumber();
        long latestLong = latest.longValue();

        List<Map<String, Object>> blocks = new ArrayList<>();
        long start = Math.max(0, latestLong - effectiveLimit + 1);
        for (long i = latestLong; i >= start; i--) {
            blocks.add(getBlockByNumber(i, fullTransactions));
        }
        return blocks;
    }

    public Map<String, Object> getTransactionReceipt(String txHash) {
        BcosTransactionReceipt receiptResponse = client.getTransactionReceipt(txHash, false);
        TransactionReceipt receipt = receiptResponse == null ? null : receiptResponse.getTransactionReceipt();
        if (receipt == null) {
            return Map.of();
        }
        Object normalized = ContractTypeConverter.normalizeValue(receipt);
        return objectMapper.convertValue(normalized, new TypeReference<>() {
        });
    }

    public Map<String, Object> getVersionInfo() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sdk", "FISCO BCOS Java SDK 3.6.0");
        result.put("group", client.getGroup());
        result.put("chainId", client.getChainId());
        result.put("cryptoType", client.getCryptoType());
        result.put("peers", objectMapper.convertValue(client.getPeers().getPeers(), Object.class));
        return result;
    }

    private Map<String, Object> normalizeBlock(BcosBlock.Block block) {
        Map<String, Object> normalized = objectMapper.convertValue(
                ContractTypeConverter.normalizeValue(block),
                new TypeReference<Map<String, Object>>() {
                }
        );

        if (!normalized.containsKey("txsRoot") && normalized.containsKey("transactionsRoot")) {
            normalized.put("txsRoot", normalized.get("transactionsRoot"));
        }
        if (!normalized.containsKey("parentHash") && normalized.containsKey("parentInfo")) {
            Object parent = normalized.get("parentInfo");
            if (parent instanceof List<?>) {
                List<?> list = (List<?>) parent;
                if (!list.isEmpty() && list.get(0) instanceof Map<?, ?>) {
                    Map<?, ?> map = (Map<?, ?>) list.get(0);
                    Object blockHash = map.get("blockHash");
                    if (blockHash != null) {
                        normalized.put("parentHash", blockHash);
                    }
                }
            }
        }
        return normalized;
    }
}
