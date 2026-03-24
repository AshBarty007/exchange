package com.fisco.exchange.settlement.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 交易清算记录
 */
public class TradeSettlement {

    private Long tradeId;
    private Long buyerId;
    private Long sellerId;
    private String buyerAddress;
    private String sellerAddress;
    private String nftContract;
    private Long tokenId;
    private BigDecimal amount;
    private String assetTokenContract;
    private LocalDateTime createdAt;

    // Constructors
    public TradeSettlement() {}

    public TradeSettlement(Long tradeId, Long buyerId, Long sellerId,
                          String buyerAddress, String sellerAddress,
                          String nftContract, Long tokenId,
                          BigDecimal amount, String assetTokenContract) {
        this.tradeId = tradeId;
        this.buyerId = buyerId;
        this.sellerId = sellerId;
        this.buyerAddress = buyerAddress;
        this.sellerAddress = sellerAddress;
        this.nftContract = nftContract;
        this.tokenId = tokenId;
        this.amount = amount;
        this.assetTokenContract = assetTokenContract;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getTradeId() { return tradeId; }
    public void setTradeId(Long tradeId) { this.tradeId = tradeId; }

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

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getAssetTokenContract() { return assetTokenContract; }
    public void setAssetTokenContract(String assetTokenContract) { this.assetTokenContract = assetTokenContract; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
