package com.kxdex.wallet.backend.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.KeyPair;
import java.util.Objects;

import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.crypto.keystore.KeyTool;
import org.fisco.bcos.sdk.v3.crypto.keystore.PEMKeyStore;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.transaction.manager.TransactionProcessorFactory;
import org.springframework.stereotype.Service;

import com.kxdex.wallet.backend.config.FiscoProperties;

@Service
public class FiscoGatewayService {

    private final Client client;
    private final FiscoProperties properties;

    public FiscoGatewayService(Client client, FiscoProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    public Client getClient() {
        return client;
    }

    /** 用私钥十六进制创建 processor（兼容旧逻辑，传 null 则用随机临时密钥） */
    public AssembleTransactionProcessor createProcessor(String privateKeyHex) {
        CryptoKeyPair keyPair = loadKeyPair(privateKeyHex);
        return TransactionProcessorFactory.createAssembleTransactionProcessor(client, keyPair);
    }

    /** 根据地址找到对应 pem 文件并创建 processor */
    public AssembleTransactionProcessor createProcessorFromAddress(String address) {
        String pemPath = resolvePemPath(address);
        CryptoKeyPair keyPair = loadKeyPairFromPem(pemPath);
        return TransactionProcessorFactory.createAssembleTransactionProcessor(client, keyPair);
    }

    /** 返回 accounts 目录下对应地址的 pem 文件路径 */
    public String resolvePemPath(String address) {
        String accountsDir = properties.getTestWalletDir();
        if (accountsDir == null || accountsDir.isBlank()) {
            throw new IllegalArgumentException("accounts dir not configured");
        }
        String addr = address.trim().toLowerCase();
        if (!addr.startsWith("0x")) addr = "0x" + addr;
        Path pem = Paths.get(accountsDir).resolve(addr + ".pem").normalize();
        if (!Files.exists(pem)) {
            throw new IllegalArgumentException("PEM file not found for address: " + address);
        }
        return pem.toString();
    }

    public CryptoKeyPair loadKeyPairFromPem(String pemPath) {
        try {
            PEMKeyStore store = new PEMKeyStore(pemPath);
            KeyPair keyPair = store.getKeyPair();
            String privateHex = KeyTool.getHexedPrivateKey(keyPair.getPrivate());
            CryptoSuite suite = new CryptoSuite(client.getCryptoType());
            return suite.loadKeyPair(privateHex);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to load PEM: " + pemPath + " — " + ex.getMessage(), ex);
        }
    }

    public String deriveAddress(String privateKeyHex) {
        return loadKeyPair(privateKeyHex).getAddress();
    }

    private CryptoKeyPair loadKeyPair(String privateKeyHex) {
        String normalized = normalizePrivateKey(privateKeyHex);
        if (normalized == null || normalized.isBlank()) {
            CryptoSuite suite = new CryptoSuite(client.getCryptoType());
            return suite.generateRandomKeyPair();
        }
        CryptoSuite suite = new CryptoSuite(client.getCryptoType());
        return suite.loadKeyPair(normalized);
    }

    private String normalizePrivateKey(String privateKeyHex) {
        if (privateKeyHex == null) return null;
        String normalized = privateKeyHex.trim();
        if (normalized.startsWith("0x") || normalized.startsWith("0X")) {
            normalized = normalized.substring(2);
        }
        return Objects.requireNonNullElse(normalized, "");
    }
}
