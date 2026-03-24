package com.fisco.exchange.matching.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 订单模型
 */
public class Order {

    private Long orderId;
    private Long userId;
    private String walletAddress;
    private OrderType orderType;  // BUY, SELL
    private OrderSide side;
    private String nftContract;
    private Long tokenId;
    private BigDecimal price;
    private BigDecimal quantity;
    private BigDecimal filledQuantity;
    private OrderStatus status;
    private String ticketType;
    private String scenicSpot;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public enum OrderType {
        LIMIT,    // 限价单
        MARKET    // 市价单
    }

    public enum OrderSide {
        BUY,
        SELL
    }

    public enum OrderStatus {
        PENDING,      // 待处理
        PARTIAL,      // 部分成交
        FILLED,       // 完全成交
        CANCELLED     // 已取消
    }

    // Constructors
    public Order() {}

    public Order(Long userId, String walletAddress, OrderSide side,
                 String nftContract, Long tokenId, BigDecimal price, BigDecimal quantity) {
        this.userId = userId;
        this.walletAddress = walletAddress;
        this.side = side;
        this.nftContract = nftContract;
        this.tokenId = tokenId;
        this.price = price;
        this.quantity = quantity;
        this.filledQuantity = BigDecimal.ZERO;
        this.status = OrderStatus.PENDING;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getWalletAddress() { return walletAddress; }
    public void setWalletAddress(String walletAddress) { this.walletAddress = walletAddress; }

    public OrderType getOrderType() { return orderType; }
    public void setOrderType(OrderType orderType) { this.orderType = orderType; }

    public OrderSide getSide() { return side; }
    public void setSide(OrderSide side) { this.side = side; }

    public String getNftContract() { return nftContract; }
    public void setNftContract(String nftContract) { this.nftContract = nftContract; }

    public Long getTokenId() { return tokenId; }
    public void setTokenId(Long tokenId) { this.tokenId = tokenId; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public BigDecimal getFilledQuantity() { return filledQuantity; }
    public void setFilledQuantity(BigDecimal filledQuantity) { this.filledQuantity = filledQuantity; }

    public BigDecimal getRemainingQuantity() {
        return quantity.subtract(filledQuantity);
    }

    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getTicketType() { return ticketType; }
    public void setTicketType(String ticketType) { this.ticketType = ticketType; }

    public String getScenicSpot() { return scenicSpot; }
    public void setScenicSpot(String scenicSpot) { this.scenicSpot = scenicSpot; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
