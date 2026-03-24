package com.fisco.exchange.matching.engine;

import com.fisco.exchange.matching.model.Order;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 做市商服务 — 模拟10个做市商，为每个景区的每种门票提供买卖挂单
 */
@Service
public class MarketMakerService {

    @Autowired
    private MatchingEngine matchingEngine;

    /** 做市商账户信息 */
    public static class MarketMaker {
        public final long userId;
        public final String name;
        public final String walletAddress;
        public BigDecimal balance;       // KXT 余额
        public int ticketsHeld;          // 持有门票数
        public int ordersPlaced;         // 已挂单数

        public MarketMaker(long userId, String name, String walletAddress, BigDecimal balance) {
            this.userId = userId;
            this.name = name;
            this.walletAddress = walletAddress;
            this.balance = balance;
            this.ticketsHeld = 200;
            this.ordersPlaced = 0;
        }

        public Map<String, Object> toMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId", userId);
            m.put("name", name);
            m.put("walletAddress", walletAddress);
            m.put("balance", balance);
            m.put("ticketsHeld", ticketsHeld);
            m.put("ordersPlaced", ordersPlaced);
            return m;
        }
    }

    /** 景区 → 门票类型 → 基准价 */
    public static final Map<String, Map<String, Integer>> SCENIC_SPOTS = new LinkedHashMap<>();
    static {
        SCENIC_SPOTS.put("故宫博物院", Map.of("普通门票", 60, "VIP门票", 300, "年卡", 800, "学生票", 20, "夜场票", 120));
        SCENIC_SPOTS.put("长城·八达岭", Map.of("普通门票", 45, "VIP门票", 200, "学生票", 25));
        SCENIC_SPOTS.put("西湖风景区", Map.of("普通门票", 0, "VIP门票", 150, "夜场票", 80));
        SCENIC_SPOTS.put("张家界国家森林公园", Map.of("普通门票", 225, "VIP门票", 500, "学生票", 115, "年卡", 1200));
        SCENIC_SPOTS.put("九寨沟", Map.of("普通门票", 169, "VIP门票", 400, "学生票", 80));
        SCENIC_SPOTS.put("黄山风景区", Map.of("普通门票", 190, "VIP门票", 450, "学生票", 95, "年卡", 999));
        SCENIC_SPOTS.put("丽江古城", Map.of("普通门票", 50, "VIP门票", 180, "夜场票", 100));
        SCENIC_SPOTS.put("鼓浪屿", Map.of("普通门票", 35, "VIP门票", 160, "学生票", 18, "夜场票", 70));
    }

    private final List<MarketMaker> marketMakers = new ArrayList<>();
    private boolean initialized = false;
    private final Random random = new Random(42);

    @PostConstruct
    public void init() {
        // 创建10个做市商账户
        String[] names = {
            "华泰做市", "中信做市", "国泰做市", "海通做市", "广发做市",
            "招商做市", "申万做市", "银河做市", "中金做市", "平安做市"
        };
        for (int i = 0; i < 10; i++) {
            marketMakers.add(new MarketMaker(
                1000L + i,
                names[i],
                String.format("0xMM%02d_%s", i, UUID.randomUUID().toString().substring(0, 8)),
                new BigDecimal(500000) // 每个做市商 50万 KXT
            ));
        }
    }

    /**
     * 初始化做市商挂单 — 为每个景区每种门票挂买卖单
     */
    public synchronized Map<String, Object> initializeOrders() {
        if (initialized) {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("message", "做市商已初始化");
            r.put("marketMakers", getMarketMakerList());
            return r;
        }

        int totalOrders = 0;

        for (Map.Entry<String, Map<String, Integer>> spotEntry : SCENIC_SPOTS.entrySet()) {
            String scenicSpot = spotEntry.getKey();
            Map<String, Integer> tickets = spotEntry.getValue();

            for (Map.Entry<String, Integer> ticketEntry : tickets.entrySet()) {
                String ticketType = ticketEntry.getKey();
                int basePrice = ticketEntry.getValue();
                if (basePrice == 0) basePrice = 10; // 免费景区给个最低价

                // 每个做市商为该门票挂 3-5 档买单 + 3-5 档卖单
                for (MarketMaker mm : marketMakers) {
                    int levels = 3 + random.nextInt(3); // 3~5 档

                    // 卖单：基准价上方
                    for (int lv = 1; lv <= levels; lv++) {
                        double spread = 0.01 + random.nextDouble() * 0.03; // 1%~4% 价差
                        double sellPrice = basePrice * (1 + spread * lv);
                        int qty = 1 + random.nextInt(5);

                        Order sell = new Order();
                        sell.setUserId(mm.userId);
                        sell.setWalletAddress(mm.walletAddress);
                        sell.setOrderType(Order.OrderType.LIMIT);
                        sell.setSide(Order.OrderSide.SELL);
                        sell.setNftContract("0xNFTTicket");
                        sell.setTokenId((long) (random.nextInt(90000) + 10000));
                        sell.setTicketType(ticketType);
                        sell.setScenicSpot(scenicSpot);
                        sell.setPrice(BigDecimal.valueOf(sellPrice).setScale(2, RoundingMode.HALF_UP));
                        sell.setQuantity(BigDecimal.valueOf(qty));

                        matchingEngine.submitOrder(sell);
                        mm.ordersPlaced++;
                        totalOrders++;
                    }

                    // 买单：基准价下方
                    for (int lv = 1; lv <= levels; lv++) {
                        double spread = 0.01 + random.nextDouble() * 0.03;
                        double buyPrice = basePrice * (1 - spread * lv);
                        if (buyPrice < 1) buyPrice = 1;
                        int qty = 1 + random.nextInt(5);

                        Order buy = new Order();
                        buy.setUserId(mm.userId);
                        buy.setWalletAddress(mm.walletAddress);
                        buy.setOrderType(Order.OrderType.LIMIT);
                        buy.setSide(Order.OrderSide.BUY);
                        buy.setNftContract("0xNFTTicket");
                        buy.setTokenId((long) (random.nextInt(90000) + 10000));
                        buy.setTicketType(ticketType);
                        buy.setScenicSpot(scenicSpot);
                        buy.setPrice(BigDecimal.valueOf(buyPrice).setScale(2, RoundingMode.HALF_UP));
                        buy.setQuantity(BigDecimal.valueOf(qty));

                        matchingEngine.submitOrder(buy);
                        mm.ordersPlaced++;
                        totalOrders++;
                    }
                }
            }
        }

        initialized = true;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "做市商初始化完成");
        result.put("totalOrders", totalOrders);
        result.put("marketMakers", getMarketMakerList());
        result.put("scenicSpots", getScenicSpotList());
        return result;
    }

    public List<Map<String, Object>> getMarketMakerList() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (MarketMaker mm : marketMakers) {
            list.add(mm.toMap());
        }
        return list;
    }

    public List<Map<String, Object>> getScenicSpotList() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Map.Entry<String, Map<String, Integer>> e : SCENIC_SPOTS.entrySet()) {
            Map<String, Object> spot = new LinkedHashMap<>();
            spot.put("name", e.getKey());
            List<Map<String, Object>> tickets = new ArrayList<>();
            for (Map.Entry<String, Integer> t : e.getValue().entrySet()) {
                Map<String, Object> ticket = new LinkedHashMap<>();
                ticket.put("ticketType", t.getKey());
                ticket.put("basePrice", t.getValue());
                tickets.add(ticket);
            }
            spot.put("tickets", tickets);
            list.add(spot);
        }
        return list;
    }

    public boolean isInitialized() {
        return initialized;
    }
}
