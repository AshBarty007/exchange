package com.fisco.exchange.matching.engine;

import com.fisco.exchange.matching.model.Order;
import com.fisco.exchange.matching.model.Trade;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 撮合引擎服务
 */
@Service
public class MatchingEngine {

    @Autowired
    private OrderBook orderBook;

    @Value("${settlement.service.url:http://localhost:8083}")
    private String settlementServiceUrl;

    private RestTemplate restTemplate;

    private final AtomicLong orderIdGenerator = new AtomicLong(1);
    private final AtomicLong tradeIdGenerator = new AtomicLong(1);

    @PostConstruct
    public void init() {
        restTemplate = new RestTemplate();
    }

    /**
     * 提交订单
     */
    public Order submitOrder(Order order) {
        // 生成订单ID
        order.setOrderId(orderIdGenerator.getAndIncrement());

        // 初始化字段
        if (order.getFilledQuantity() == null) {
            order.setFilledQuantity(java.math.BigDecimal.ZERO);
        }
        if (order.getStatus() == null) {
            order.setStatus(Order.OrderStatus.PENDING);
        }
        if (order.getCreatedAt() == null) {
            order.setCreatedAt(java.time.LocalDateTime.now());
        }
        if (order.getUpdatedAt() == null) {
            order.setUpdatedAt(java.time.LocalDateTime.now());
        }

        // 添加到订单簿
        orderBook.addOrder(order);

        // 尝试撮合
        List<Trade> trades = orderBook.matchOrders();

        // 处理成交记录
        if (!trades.isEmpty()) {
            processTrades(trades);
        }

        return order;
    }

    /**
     * 取消订单
     */
    public boolean cancelOrder(Long orderId) {
        return orderBook.cancelOrder(orderId);
    }

    /**
     * 获取订单
     */
    public Order getOrder(Long orderId) {
        return orderBook.getOrder(orderId);
    }

    /**
     * 获取市场深度
     */
    public Object getMarketDepth(int levels) {
        return orderBook.getDepth(levels);
    }

    /**
     * 处理成交记录 - 发送到清算服务
     */
    private void processTrades(List<Trade> trades) {
        for (Trade trade : trades) {
            trade.setTradeId(tradeIdGenerator.getAndIncrement());

            // 存储到最近成交记录
            orderBook.addRecentTrade(trade);

            System.out.println("Trade matched: " + trade.getTradeId() +
                             " Buyer: " + trade.getBuyerId() +
                             " Seller: " + trade.getSellerId() +
                             " Price: " + trade.getPrice() +
                             " Quantity: " + trade.getQuantity());

            // 发送到清算服务
            sendToSettlement(trade);
        }
    }

    /**
     * 将成交记录发送到清算服务
     */
    private void sendToSettlement(Trade trade) {
        try {
            String url = settlementServiceUrl + "/api/settlement/trades";

            Map<String, Object> body = new HashMap<>();
            body.put("tradeId", trade.getTradeId());
            body.put("buyerId", trade.getBuyerId());
            body.put("sellerId", trade.getSellerId());
            body.put("buyerAddress", trade.getBuyerAddress());
            body.put("sellerAddress", trade.getSellerAddress());
            body.put("nftContract", trade.getNftContract());
            body.put("tokenId", trade.getTokenId());
            body.put("amount", trade.getPrice().multiply(trade.getQuantity()));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            restTemplate.postForEntity(url, request, Map.class);

            trade.setStatus(Trade.TradeStatus.SETTLING);
            System.out.println("Trade " + trade.getTradeId() + " sent to settlement service.");

        } catch (Exception e) {
            System.err.println("Failed to send trade " + trade.getTradeId() + " to settlement: " + e.getMessage());
        }
    }

    /**
     * 批量撮合（定时任务）
     */
    public List<Trade> batchMatch() {
        return orderBook.matchOrders();
    }

    /**
     * 获取指定门票类型的订单簿
     */
    public Map<String, Object> getOrderBook(String ticketType, String scenicSpot) {
        return orderBook.getOrderBook(ticketType, scenicSpot);
    }

    /**
     * 获取最近成交记录
     */
    public List<Trade> getRecentTrades(int limit) {
        return orderBook.getRecentTrades(limit);
    }

    /**
     * 获取挂单摘要（按门票类型聚合）
     */
    public List<Map<String, Object>> getListings() {
        return orderBook.getListingsSummary();
    }
}
