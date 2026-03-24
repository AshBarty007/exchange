package com.kxdex.wallet.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.kxdex.wallet.backend.model.CreateWalletRequest;
import com.kxdex.wallet.backend.model.WalletRecord;
import com.kxdex.wallet.backend.service.WalletService;

@RestController
@RequestMapping("/api/v1/wallets")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    /** List all wallets (PEM files) with name/role metadata. */
    @GetMapping("/list")
    public List<WalletRecord> list() {
        return walletService.listWallets();
    }

    /** Create a new wallet: generate keypair via Java SDK, import to WeBASE-Sign, grant Auth role. */
    @PostMapping("/create")
    public WalletRecord create(@RequestBody CreateWalletRequest request) {
        return walletService.createWallet(request.getName(), request.getRole());
    }

    /** Delete a wallet: remove PEM files and metadata. */
    @DeleteMapping("/delete/{address}")
    public Map<String, Object> delete(@PathVariable String address) {
        walletService.deleteWallet(address);
        return Map.of("success", true, "message", "Wallet deleted: " + address);
    }
}
