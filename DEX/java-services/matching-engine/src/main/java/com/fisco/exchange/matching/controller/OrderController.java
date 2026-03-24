package com.fisco.exchange.matching.controller;

import com.fisco.exchange.matching.engine.MatchingEngine;
import com.fisco.exchange.matching.engine.MarketMakerService;
import com.fisco.exchange.matching.model.Order;
import com.fisco.exchange.matching.model.Trade;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 订单控制器
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private MatchingEngine matchingEngine;

    @Autowired
    private MarketMakerService marketMakerService;

    /**
     * 提交订单
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> submitOrder(@RequestBody Order order) {
        try {
            Order submittedOrder = matchingEngine.submitOrder(order);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Order submitted successfully");
            response.put("order", submittedOrder);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * 取消订单
     */
    @DeleteMapping("/{orderId}")
    public ResponseEntity<Map<String, Object>> cancelOrder(@PathVariable Long orderId) {
        boolean cancelled = matchingEngine.cancelOrder(orderId);

        Map<String, Object> response = new HashMap<>();
        if (cancelled) {
            response.put("message", "Order cancelled successfully");
            return ResponseEntity.ok(response);
        } else {
            response.put("error", "Order not found");
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 查询订单
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<Order> getOrder(@PathVariable Long orderId) {
        Order order = matchingEngine.getOrder(orderId);

        if (order != null) {
            return ResponseEntity.ok(order);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 获取市场深度
     */
    @GetMapping("/depth")
    public ResponseEntity<Object> getMarketDepth(@RequestParam(defaultValue = "10") int levels) {
        Object depth = matchingEngine.getMarketDepth(levels);
        return ResponseEntity.ok(depth);
    }

    /**
     * 健康检查
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("service", "matching-engine");
        return ResponseEntity.ok(response);
    }

    /**
     * 获取最近成交记录
     */
    @GetMapping("/trades/recent")
    public ResponseEntity<List<Trade>> getRecentTrades(@RequestParam(defaultValue = "50") int limit) {
        List<Trade> trades = matchingEngine.getRecentTrades(limit);
        return ResponseEntity.ok(trades);
    }

    /**
     * 获取挂单摘要（按门票类型聚合）
     */
    @GetMapping("/listings")
    public ResponseEntity<List<Map<String, Object>>> getListings() {
        List<Map<String, Object>> listings = matchingEngine.getListings();
        return ResponseEntity.ok(listings);
    }

    /**
     * 获取指定门票类型的订单簿（买卖挂单明细）
     */
    @GetMapping("/orderbook")
    public ResponseEntity<Map<String, Object>> getOrderBook(
            @RequestParam String ticketType,
            @RequestParam(required = false) String scenicSpot) {
        Map<String, Object> orderBook = matchingEngine.getOrderBook(ticketType, scenicSpot);
        return ResponseEntity.ok(orderBook);
    }

    /**
     * 获取做市商列表
     */
    @GetMapping("/market-makers")
    public ResponseEntity<Map<String, Object>> getMarketMakers() {
        Map<String, Object> result = new HashMap<>();
        result.put("initialized", marketMakerService.isInitialized());
        result.put("marketMakers", marketMakerService.getMarketMakerList());
        return ResponseEntity.ok(result);
    }

    /**
     * 初始化做市商挂单
     */
    @PostMapping("/market-makers/init")
    public ResponseEntity<Map<String, Object>> initMarketMakers() {
        Map<String, Object> result = marketMakerService.initializeOrders();
        return ResponseEntity.ok(result);
    }

    /**
     * 获取景区列表
     */
    @GetMapping("/scenic-spots")
    public ResponseEntity<List<Map<String, Object>>> getScenicSpots() {
        return ResponseEntity.ok(marketMakerService.getScenicSpotList());
    }
}
