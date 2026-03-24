package com.fisco.exchange.matching.engine;

import com.fisco.exchange.matching.model.Order;
import com.fisco.exchange.matching.model.Trade;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.stream.Collectors;

/**
 * 订单簿 - 管理买卖订单
 */
@Component
public class OrderBook {

    // 买单队列（价格从高到低）
    private final PriorityBlockingQueue<Order> buyOrders = new PriorityBlockingQueue<>(
        100,
        (o1, o2) -> o2.getPrice().compareTo(o1.getPrice())
    );

    // 卖单队列（价格从低到高）
    private final PriorityBlockingQueue<Order> sellOrders = new PriorityBlockingQueue<>(
        100,
        Comparator.comparing(Order::getPrice)
    );

    // 订单索引
    private final Map<Long, Order> orderIndex = new ConcurrentHashMap<>();

    // 最近成交记录（上限200条）
    private final ConcurrentLinkedDeque<Trade> recentTrades = new ConcurrentLinkedDeque<>();
    private static final int MAX_RECENT_TRADES = 200;

    /**
     * 添加订单
     */
    public void addOrder(Order order) {
        orderIndex.put(order.getOrderId(), order);

        if (order.getSide() == Order.OrderSide.BUY) {
            buyOrders.offer(order);
        } else {
            sellOrders.offer(order);
        }
    }

    /**
     * 取消订单
     */
    public boolean cancelOrder(Long orderId) {
        Order order = orderIndex.get(orderId);
        if (order == null) {
            return false;
        }

        order.setStatus(Order.OrderStatus.CANCELLED);

        if (order.getSide() == Order.OrderSide.BUY) {
            buyOrders.remove(order);
        } else {
            sellOrders.remove(order);
        }

        orderIndex.remove(orderId);
        return true;
    }

    /**
     * 获取最佳买价
     */
    public BigDecimal getBestBidPrice() {
        Order bestBuy = buyOrders.peek();
        return bestBuy != null ? bestBuy.getPrice() : BigDecimal.ZERO;
    }

    /**
     * 获取最佳卖价
     */
    public BigDecimal getBestAskPrice() {
        Order bestSell = sellOrders.peek();
        return bestSell != null ? bestSell.getPrice() : BigDecimal.ZERO;
    }

    /**
     * 撮合订单 — 按 ticketType + scenicSpot 匹配
     */
    public List<Trade> matchOrders() {
        List<Trade> trades = new ArrayList<>();

        // 将买单按 ticketType+scenicSpot 分组尝试撮合
        List<Order> buyList = new ArrayList<>(buyOrders);
        buyList.sort((a, b) -> b.getPrice().compareTo(a.getPrice()));

        for (Order buyOrder : buyList) {
            if (buyOrder.getStatus() == Order.OrderStatus.FILLED ||
                buyOrder.getStatus() == Order.OrderStatus.CANCELLED) continue;

            String buyKey = matchKey(buyOrder);

            // 找到同类型最低价卖单
            Order bestSell = null;
            for (Order sellOrder : sellOrders) {
                if (sellOrder.getStatus() == Order.OrderStatus.FILLED ||
                    sellOrder.getStatus() == Order.OrderStatus.CANCELLED) continue;
                if (!matchKey(sellOrder).equals(buyKey)) continue;
                if (buyOrder.getPrice().compareTo(sellOrder.getPrice()) < 0) continue;
                if (bestSell == null || sellOrder.getPrice().compareTo(bestSell.getPrice()) < 0) {
                    bestSell = sellOrder;
                }
            }

            if (bestSell == null) continue;

            BigDecimal matchPrice = bestSell.getPrice();
            BigDecimal matchQuantity = buyOrder.getRemainingQuantity().min(bestSell.getRemainingQuantity());

            Trade trade = new Trade(buyOrder, bestSell, matchPrice, matchQuantity);
            trades.add(trade);

            buyOrder.setFilledQuantity(buyOrder.getFilledQuantity().add(matchQuantity));
            bestSell.setFilledQuantity(bestSell.getFilledQuantity().add(matchQuantity));

            if (buyOrder.getRemainingQuantity().compareTo(BigDecimal.ZERO) == 0) {
                buyOrder.setStatus(Order.OrderStatus.FILLED);
                buyOrders.remove(buyOrder);
                orderIndex.remove(buyOrder.getOrderId());
            } else {
                buyOrder.setStatus(Order.OrderStatus.PARTIAL);
            }

            if (bestSell.getRemainingQuantity().compareTo(BigDecimal.ZERO) == 0) {
                bestSell.setStatus(Order.OrderStatus.FILLED);
                sellOrders.remove(bestSell);
                orderIndex.remove(bestSell.getOrderId());
            } else {
                bestSell.setStatus(Order.OrderStatus.PARTIAL);
            }
        }

        return trades;
    }

    /**
     * 生成撮合键：ticketType + scenicSpot
     */
    private String matchKey(Order order) {
        String tt = order.getTicketType() != null ? order.getTicketType() : "";
        String ss = order.getScenicSpot() != null ? order.getScenicSpot() : "";
        return tt + "|" + ss;
    }

    /**
     * 获取指定门票类型的订单簿（原始买卖单列表）
     */
    public Map<String, Object> getOrderBook(String ticketType, String scenicSpot) {
        Map<String, Object> result = new HashMap<>();
        String key = (ticketType != null ? ticketType : "") + "|" + (scenicSpot != null ? scenicSpot : "");

        // 聚合买单（按价格分组）
        Map<BigDecimal, BigDecimal> bidMap = new TreeMap<>(Comparator.reverseOrder());
        for (Order o : buyOrders) {
            if (matchKey(o).equals(key)) {
                bidMap.merge(o.getPrice(), o.getRemainingQuantity(), BigDecimal::add);
            }
        }
        List<Map<String, Object>> bids = new ArrayList<>();
        BigDecimal bidCum = BigDecimal.ZERO;
        for (Map.Entry<BigDecimal, BigDecimal> e : bidMap.entrySet()) {
            bidCum = bidCum.add(e.getValue());
            Map<String, Object> row = new HashMap<>();
            row.put("price", e.getKey());
            row.put("quantity", e.getValue());
            row.put("cumulative", bidCum);
            bids.add(row);
        }

        // 聚合卖单（按价格分组）
        Map<BigDecimal, BigDecimal> askMap = new TreeMap<>();
        for (Order o : sellOrders) {
            if (matchKey(o).equals(key)) {
                askMap.merge(o.getPrice(), o.getRemainingQuantity(), BigDecimal::add);
            }
        }
        List<Map<String, Object>> asks = new ArrayList<>();
        BigDecimal askCum = BigDecimal.ZERO;
        for (Map.Entry<BigDecimal, BigDecimal> e : askMap.entrySet()) {
            askCum = askCum.add(e.getValue());
            Map<String, Object> row = new HashMap<>();
            row.put("price", e.getKey());
            row.put("quantity", e.getValue());
            row.put("cumulative", askCum);
            asks.add(row);
        }

        result.put("bids", bids);
        result.put("asks", asks);
        result.put("ticketType", ticketType);
        result.put("scenicSpot", scenicSpot);
        return result;
    }

    /**
     * 获取订单深度
     */
    public Map<String, Object> getDepth(int levels) {
        Map<String, Object> depth = new HashMap<>();

        List<Map<String, Object>> bids = new ArrayList<>();
        List<Map<String, Object>> asks = new ArrayList<>();

        // 买单深度
        Iterator<Order> buyIterator = buyOrders.iterator();
        int bidCount = 0;
        while (buyIterator.hasNext() && bidCount < levels) {
            Order order = buyIterator.next();
            Map<String, Object> level = new HashMap<>();
            level.put("price", order.getPrice());
            level.put("quantity", order.getRemainingQuantity());
            bids.add(level);
            bidCount++;
        }

        // 卖单深度
        Iterator<Order> sellIterator = sellOrders.iterator();
        int askCount = 0;
        while (sellIterator.hasNext() && askCount < levels) {
            Order order = sellIterator.next();
            Map<String, Object> level = new HashMap<>();
            level.put("price", order.getPrice());
            level.put("quantity", order.getRemainingQuantity());
            asks.add(level);
            askCount++;
        }

        depth.put("bids", bids);
        depth.put("asks", asks);

        return depth;
    }

    /**
     * 获取订单
     */
    public Order getOrder(Long orderId) {
        return orderIndex.get(orderId);
    }

    /**
     * 添加成交记录
     */
    public void addRecentTrade(Trade trade) {
        recentTrades.addFirst(trade);
        while (recentTrades.size() > MAX_RECENT_TRADES) {
            recentTrades.removeLast();
        }
    }

    /**
     * 获取最近成交记录
     */
    public List<Trade> getRecentTrades(int limit) {
        List<Trade> result = new ArrayList<>();
        int count = 0;
        for (Trade trade : recentTrades) {
            if (count >= limit) break;
            result.add(trade);
            count++;
        }
        return result;
    }

    /**
     * 按门票类型聚合卖单挂单摘要
     */
    public List<Map<String, Object>> getListingsSummary() {
        Map<String, Map<String, Object>> grouped = new LinkedHashMap<>();

        for (Order order : sellOrders) {
            String type = order.getTicketType() != null ? order.getTicketType() : "未知";
            Map<String, Object> summary = grouped.computeIfAbsent(type, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("ticketType", k);
                m.put("floorPrice", order.getPrice());
                m.put("listedCount", 0);
                m.put("tokenIds", new ArrayList<Long>());
                m.put("totalVolume", BigDecimal.ZERO);
                return m;
            });

            int count = (int) summary.get("listedCount");
            summary.put("listedCount", count + 1);

            BigDecimal currentFloor = (BigDecimal) summary.get("floorPrice");
            if (order.getPrice().compareTo(currentFloor) < 0) {
                summary.put("floorPrice", order.getPrice());
            }

            @SuppressWarnings("unchecked")
            List<Long> tokenIds = (List<Long>) summary.get("tokenIds");
            tokenIds.add(order.getTokenId());

            BigDecimal vol = (BigDecimal) summary.get("totalVolume");
            summary.put("totalVolume", vol.add(order.getPrice().multiply(order.getRemainingQuantity())));
        }

        return new ArrayList<>(grouped.values());
    }

    /**
     * 获取买单列表（供深度图使用）
     */
    public List<Order> getBuyOrders() {
        return new ArrayList<>(buyOrders);
    }

    /**
     * 获取卖单列表（供深度图使用）
     */
    public List<Order> getSellOrders() {
        return new ArrayList<>(sellOrders);
    }

    /**
     * 清空订单簿
     */
    public void clear() {
        buyOrders.clear();
        sellOrders.clear();
        orderIndex.clear();
        recentTrades.clear();
    }
}
