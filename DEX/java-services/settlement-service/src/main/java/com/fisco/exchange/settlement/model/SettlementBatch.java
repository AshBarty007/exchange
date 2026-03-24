package com.fisco.exchange.settlement.model;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 清算批次
 */
public class SettlementBatch {

    private Long batchId;
    private List<TradeSettlement> trades;
    private BatchStatus status;
    private String txHash;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime submittedAt;
    private LocalDateTime confirmedAt;

    public enum BatchStatus {
        PENDING,      // 待提交
        SUBMITTED,    // 已提交到区块链
        CONFIRMED,    // 已确认
        FAILED        // 失败
    }

    // Getters and Setters
    public Long getBatchId() { return batchId; }
    public void setBatchId(Long batchId) { this.batchId = batchId; }

    public List<TradeSettlement> getTrades() { return trades; }
    public void setTrades(List<TradeSettlement> trades) { this.trades = trades; }

    public BatchStatus getStatus() { return status; }
    public void setStatus(BatchStatus status) { this.status = status; }

    public String getTxHash() { return txHash; }
    public void setTxHash(String txHash) { this.txHash = txHash; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }

    public int getTradeCount() {
        return trades != null ? trades.size() : 0;
    }
}
