package com.fisco.exchange.settlement.service;

import com.fisco.exchange.settlement.model.SettlementBatch;
import com.fisco.exchange.settlement.model.TradeSettlement;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.client.protocol.response.BcosTransactionReceipt;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.manager.TransactionProcessorFactory;
import org.fisco.bcos.sdk.v3.transaction.model.dto.TransactionResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 清算服务 - 批量执行链上资产转移
 */
@Service
public class SettlementService {

    @Autowired
    private Client client;

    @Autowired
    private CryptoKeyPair cryptoKeyPair;

    @Value("${blockchain.custody.contract}")
    private String custodyContract;

    @Value("${blockchain.asset.token.contract}")
    private String assetTokenContract;

    @Value("${blockchain.nft.contract}")
    private String nftContract;

    private AssembleTransactionProcessor transactionProcessor;

    private final AtomicLong batchIdGenerator = new AtomicLong(1);
    private final List<TradeSettlement> pendingTrades = new ArrayList<>();
    private final ConcurrentHashMap<Long, SettlementBatch> settlementHistory = new ConcurrentHashMap<>();

    // ExchangeCustody batchSettle ABI
    private static final String CUSTODY_ABI = "[{\"inputs\":[{\"name\":\"_buyers\",\"type\":\"address[]\"},{\"name\":\"_sellers\",\"type\":\"address[]\"},{\"name\":\"_assetToken\",\"type\":\"address\"},{\"name\":\"_amounts\",\"type\":\"uint256[]\"},{\"name\":\"_nftContract\",\"type\":\"address\"},{\"name\":\"_tokenIds\",\"type\":\"uint256[]\"}],\"name\":\"batchSettle\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]";

    @PostConstruct
    public void init() throws Exception {
        transactionProcessor = TransactionProcessorFactory.createAssembleTransactionProcessor(
            client, cryptoKeyPair
        );
        System.out.println("SettlementService initialized. Account: " + cryptoKeyPair.getAddress());
    }

    /**
     * 添加待清算交易
     */
    public synchronized void addTradeForSettlement(TradeSettlement trade) {
        pendingTrades.add(trade);
    }

    /**
     * 批量清算
     */
    public synchronized SettlementBatch batchSettle() {
        if (pendingTrades.isEmpty()) {
            return null;
        }

        Long batchId = batchIdGenerator.getAndIncrement();
        SettlementBatch batch = new SettlementBatch();
        batch.setBatchId(batchId);
        batch.setTrades(new ArrayList<>(pendingTrades));
        batch.setStatus(SettlementBatch.BatchStatus.PENDING);
        batch.setCreatedAt(LocalDateTime.now());

        try {
            // 准备批量转账数据
            List<String> buyers = new ArrayList<>();
            List<String> sellers = new ArrayList<>();
            List<BigInteger> amounts = new ArrayList<>();
            List<BigInteger> tokenIds = new ArrayList<>();

            for (TradeSettlement trade : pendingTrades) {
                buyers.add(trade.getBuyerAddress());
                sellers.add(trade.getSellerAddress());
                amounts.add(trade.getAmount().toBigInteger());
                tokenIds.add(BigInteger.valueOf(trade.getTokenId()));
            }

            // 调用链上 ExchangeCustody.batchSettle
            String txHash = executeBlockchainSettlement(buyers, sellers, amounts, tokenIds);

            batch.setTxHash(txHash);
            batch.setStatus(SettlementBatch.BatchStatus.SUBMITTED);
            batch.setSubmittedAt(LocalDateTime.now());

            pendingTrades.clear();
            settlementHistory.put(batchId, batch);

            System.out.println("Settlement batch " + batchId + " submitted. txHash: " + txHash);
            return batch;

        } catch (Exception e) {
            batch.setStatus(SettlementBatch.BatchStatus.FAILED);
            batch.setErrorMessage(e.getMessage());
            settlementHistory.put(batchId, batch);
            System.err.println("Settlement batch " + batchId + " failed: " + e.getMessage());
            return batch;
        }
    }

    /**
     * 执行区块链清算 - 调用 ExchangeCustody.batchSettle
     */
    private String executeBlockchainSettlement(
        List<String> buyers,
        List<String> sellers,
        List<BigInteger> amounts,
        List<BigInteger> tokenIds
    ) throws Exception {
        List<Object> params = new ArrayList<>();
        params.add(buyers);
        params.add(sellers);
        params.add(assetTokenContract);
        params.add(amounts);
        params.add(nftContract);
        params.add(tokenIds);

        TransactionResponse response = transactionProcessor.sendTransactionAndGetResponse(
            custodyContract,
            CUSTODY_ABI,
            "batchSettle",
            params
        );

        TransactionReceipt receipt = response.getTransactionReceipt();
        if (receipt.isStatusOK()) {
            return receipt.getTransactionHash();
        } else {
            throw new RuntimeException("batchSettle failed: " + receipt.getMessage());
        }
    }

    /**
     * 查询链上交易回执确认清算结果
     */
    public boolean checkTransactionReceipt(String txHash) {
        try {
            BcosTransactionReceipt response = client.getTransactionReceipt(txHash, false);
            TransactionReceipt receipt = response.getTransactionReceipt();
            return receipt != null && receipt.isStatusOK();
        } catch (Exception e) {
            System.err.println("Failed to check receipt for " + txHash + ": " + e.getMessage());
            return false;
        }
    }

    /**
     * 确认清算结果
     */
    public void confirmSettlement(Long batchId, boolean success) {
        SettlementBatch batch = settlementHistory.get(batchId);
        if (batch != null) {
            if (success) {
                batch.setStatus(SettlementBatch.BatchStatus.CONFIRMED);
                batch.setConfirmedAt(LocalDateTime.now());
            } else {
                batch.setStatus(SettlementBatch.BatchStatus.FAILED);
            }
        }
    }

    /**
     * 查询清算批次
     */
    public SettlementBatch getSettlementBatch(Long batchId) {
        return settlementHistory.get(batchId);
    }

    /**
     * 获取待清算交易数量
     */
    public int getPendingTradesCount() {
        return pendingTrades.size();
    }

    /**
     * 获取清算历史
     */
    public List<SettlementBatch> getSettlementHistory(int limit) {
        return settlementHistory.values().stream()
            .sorted((b1, b2) -> b2.getCreatedAt().compareTo(b1.getCreatedAt()))
            .limit(limit)
            .collect(java.util.stream.Collectors.toList());
    }

    /**
     * 获取所有已提交但未确认的批次
     */
    public List<SettlementBatch> getSubmittedBatches() {
        return settlementHistory.values().stream()
            .filter(b -> b.getStatus() == SettlementBatch.BatchStatus.SUBMITTED)
            .collect(java.util.stream.Collectors.toList());
    }
}
