package com.fisco.exchange.settlement.controller;

import com.fisco.exchange.settlement.model.SettlementBatch;
import com.fisco.exchange.settlement.model.TradeSettlement;
import com.fisco.exchange.settlement.service.SettlementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 清算控制器
 */
@RestController
@RequestMapping("/api/settlement")
public class SettlementController {

    @Autowired
    private SettlementService settlementService;

    /**
     * 添加待清算交易
     */
    @PostMapping("/trades")
    public ResponseEntity<Map<String, Object>> addTrade(@RequestBody TradeSettlement trade) {
        settlementService.addTradeForSettlement(trade);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Trade added for settlement");
        response.put("pending_count", settlementService.getPendingTradesCount());

        return ResponseEntity.ok(response);
    }

    /**
     * 手动触发批量清算
     */
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> triggerBatchSettlement() {
        SettlementBatch batch = settlementService.batchSettle();

        Map<String, Object> response = new HashMap<>();
        if (batch != null) {
            response.put("message", "Settlement batch created");
            response.put("batch_id", batch.getBatchId());
            response.put("trade_count", batch.getTradeCount());
            response.put("status", batch.getStatus());
            response.put("tx_hash", batch.getTxHash());
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "No pending trades");
            return ResponseEntity.ok(response);
        }
    }

    /**
     * 查询清算批次
     */
    @GetMapping("/batch/{batchId}")
    public ResponseEntity<SettlementBatch> getSettlementBatch(@PathVariable Long batchId) {
        SettlementBatch batch = settlementService.getSettlementBatch(batchId);

        if (batch != null) {
            return ResponseEntity.ok(batch);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * 确认清算结果
     */
    @PostMapping("/batch/{batchId}/confirm")
    public ResponseEntity<Map<String, String>> confirmSettlement(
        @PathVariable Long batchId,
        @RequestParam boolean success
    ) {
        settlementService.confirmSettlement(batchId, success);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Settlement confirmed");
        return ResponseEntity.ok(response);
    }

    /**
     * 查询清算历史
     */
    @GetMapping("/history")
    public ResponseEntity<List<SettlementBatch>> getSettlementHistory(
        @RequestParam(defaultValue = "20") int limit
    ) {
        List<SettlementBatch> history = settlementService.getSettlementHistory(limit);
        return ResponseEntity.ok(history);
    }

    /**
     * 获取待清算交易数量
     */
    @GetMapping("/pending")
    public ResponseEntity<Map<String, Integer>> getPendingCount() {
        Map<String, Integer> response = new HashMap<>();
        response.put("pending_count", settlementService.getPendingTradesCount());
        return ResponseEntity.ok(response);
    }

    /**
     * 健康检查
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("service", "settlement-service");
        return ResponseEntity.ok(response);
    }
}
