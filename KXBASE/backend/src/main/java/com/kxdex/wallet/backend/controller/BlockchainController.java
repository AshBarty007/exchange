package com.kxdex.wallet.backend.controller;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.kxdex.wallet.backend.service.BlockchainService;

@RestController
@RequestMapping("/api/v1/blockchain")
public class BlockchainController {

    private final BlockchainService blockchainService;

    public BlockchainController(BlockchainService blockchainService) {
        this.blockchainService = blockchainService;
    }

    @GetMapping("/block-number")
    public Map<String, Object> blockNumber() {
        BigInteger blockNumber = blockchainService.getBlockNumber();
        return Map.of("blockNumber", blockNumber.longValue());
    }

    @GetMapping("/blocks")
    public List<Map<String, Object>> recentBlocks(
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "false") boolean fullTransactions) {
        return blockchainService.getRecentBlocks(limit, fullTransactions);
    }

    @GetMapping("/blocks/{number}")
    public Map<String, Object> blockByNumber(
            @PathVariable long number,
            @RequestParam(defaultValue = "false") boolean fullTransactions) {
        return blockchainService.getBlockByNumber(number, fullTransactions);
    }

    @GetMapping("/transactions/{txHash}/receipt")
    public Map<String, Object> transactionReceipt(@PathVariable String txHash) {
        return blockchainService.getTransactionReceipt(txHash);
    }
}
