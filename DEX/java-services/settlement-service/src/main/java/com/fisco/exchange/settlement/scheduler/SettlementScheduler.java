package com.fisco.exchange.settlement.scheduler;

import com.fisco.exchange.settlement.model.SettlementBatch;
import com.fisco.exchange.settlement.service.SettlementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 定时清算任务
 */
@Component
public class SettlementScheduler {

    @Autowired
    private SettlementService settlementService;

    /**
     * 每10秒执行一次批量清算
     */
    @Scheduled(fixedRate = 10000)
    public void scheduledSettlement() {
        int pendingCount = settlementService.getPendingTradesCount();

        if (pendingCount > 0) {
            System.out.println("Starting scheduled settlement. Pending trades: " + pendingCount);

            SettlementBatch batch = settlementService.batchSettle();

            if (batch != null) {
                System.out.println("Settlement batch created: " + batch.getBatchId() +
                                 " Status: " + batch.getStatus() +
                                 " TxHash: " + batch.getTxHash() +
                                 " Trades: " + batch.getTradeCount());
            }
        }
    }

    /**
     * 每30秒检查已提交批次的链上回执，确认清算结果
     */
    @Scheduled(fixedRate = 30000)
    public void checkSettlementStatus() {
        List<SettlementBatch> submittedBatches = settlementService.getSubmittedBatches();

        for (SettlementBatch batch : submittedBatches) {
            if (batch.getTxHash() == null) {
                continue;
            }

            boolean success = settlementService.checkTransactionReceipt(batch.getTxHash());
            if (success) {
                settlementService.confirmSettlement(batch.getBatchId(), true);
                System.out.println("Settlement batch " + batch.getBatchId() + " confirmed on-chain.");
            } else {
                System.out.println("Settlement batch " + batch.getBatchId() + " not yet confirmed, txHash: " + batch.getTxHash());
            }
        }
    }
}
