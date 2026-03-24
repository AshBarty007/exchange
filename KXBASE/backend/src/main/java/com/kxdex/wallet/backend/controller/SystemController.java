package com.kxdex.wallet.backend.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kxdex.wallet.backend.service.BlockchainService;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    private final BlockchainService blockchainService;

    public SystemController(BlockchainService blockchainService) {
        this.blockchainService = blockchainService;
    }

    @GetMapping("/version")
    public Map<String, Object> version() {
        return blockchainService.getVersionInfo();
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Map<String, Object> status = new LinkedHashMap<>();
        status.put("status", "UP");
        status.put("blockNumber", blockchainService.getBlockNumber().longValue());
        status.put("version", blockchainService.getVersionInfo());
        return status;
    }
}
