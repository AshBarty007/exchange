package com.fisco.exchange.matching.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 交易记录
 */
public class Trade {

    private Long tradeId;
    private Long buyOrderId;
    private Long sellOrderId;
    private Long buyerId;
    private Long sellerId;
    private String buyerAddress;
    private String sellerAddress;
    private String nftContract;
    private Long tokenId;
    private BigDecimal price;
    private BigDecimal quantity;
    private TradeStatus status;
    private String settlementTxHash;
    private LocalDateTime createdAt;
    private LocalDateTime settledAt;

    public enum TradeStatus {
        MATCHED,      // 已撮合
        SETTLING,     // 清算中
        SETTLED,      // 已清算
        FAILED        // 失败
    }

    // Constructors
    public Trade() {}

    public Trade(Order buyOrder, Order sellOrder, BigDecimal matchPrice, BigDecimal matchQuantity) {
        this.buyOrderId = buyOrder.getOrderId();
        this.sellOrderId = sellOrder.getOrderId();
        this.buyerId = buyOrder.getUserId();
        this.sellerId = sellOrder.getUserId();
        this.buyerAddress = buyOrder.getWalletAddress();
        this.sellerAddress = sellOrder.getWalletAddress();
        this.nftContract = buyOrder.getNftContract();
        this.tokenId = buyOrder.getTokenId();
        this.price = matchPrice;
        this.quantity = matchQuantity;
        this.status = TradeStatus.MATCHED;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getTradeId() { return tradeId; }
    public void setTradeId(Long tradeId) { this.tradeId = tradeId; }

    public Long getBuyOrderId() { return buyOrderId; }
    public void setBuyOrderId(Long buyOrderId) { this.buyOrderId = buyOrderId; }

    public Long getSellOrderId() { return sellOrderId; }
    public void setSellOrderId(Long sellOrderId) { this.sellOrderId = sellOrderId; }

    public Long getBuyerId() { return buyerId; }
    public void setBuyerId(Long buyerId) { this.buyerId = buyerId; }

    public Long getSellerId() { return sellerId; }
    public void setSellerId(Long sellerId) { this.sellerId = sellerId; }

    public String getBuyerAddress() { return buyerAddress; }
    public void setBuyerAddress(String buyerAddress) { this.buyerAddress = buyerAddress; }

    public String getSellerAddress() { return sellerAddress; }
    public void setSellerAddress(String sellerAddress) { this.sellerAddress = sellerAddress; }

    public String getNftContract() { return nftContract; }
    public void setNftContract(String nftContract) { this.nftContract = nftContract; }

    public Long getTokenId() { return tokenId; }
    public void setTokenId(Long tokenId) { this.tokenId = tokenId; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public TradeStatus getStatus() { return status; }
    public void setStatus(TradeStatus status) { this.status = status; }

    public String getSettlementTxHash() { return settlementTxHash; }
    public void setSettlementTxHash(String settlementTxHash) { this.settlementTxHash = settlementTxHash; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getSettledAt() { return settledAt; }
    public void setSettledAt(LocalDateTime settledAt) { this.settledAt = settledAt; }
}
