package com.kxdex.wallet.backend.service;

import java.io.IOException;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.KeyPair;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import org.fisco.bcos.sdk.v3.crypto.CryptoSuite;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.crypto.keystore.KeyTool;
import org.fisco.bcos.sdk.v3.crypto.keystore.PEMKeyStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kxdex.wallet.backend.config.FiscoProperties;
import com.kxdex.wallet.backend.model.ContractSendRequest;
import com.kxdex.wallet.backend.model.WalletRecord;

@Service
public class WalletService {

    private static final Logger log = LoggerFactory.getLogger(WalletService.class);
    private static final String META_FILE = "wallet-meta.json";

    private final FiscoProperties properties;
    private final FiscoGatewayService gatewayService;
    private final ContractExecutionService contractExecutionService;
    private final WeBaseSignService weBaseSignService;
    private final ObjectMapper objectMapper;

    public WalletService(FiscoProperties properties,
                         FiscoGatewayService gatewayService,
                         ContractExecutionService contractExecutionService,
                         WeBaseSignService weBaseSignService,
                         ObjectMapper objectMapper) {
        this.properties = properties;
        this.gatewayService = gatewayService;
        this.contractExecutionService = contractExecutionService;
        this.weBaseSignService = weBaseSignService;
        this.objectMapper = objectMapper;
    }

    // ========== Public API ==========

    /**
     * Create a new wallet:
     * 1. Generate keypair via FISCO Java SDK
     * 2. Save PEM locally (for SDK transaction processor)
     * 3. Import private key to WeBASE-Sign (AES encrypted in MySQL)
     * 4. Save metadata (name, role, signUserId)
     * 5. Grant Auth role via smart contract
     */
    public WalletRecord createWallet(String name, String role) {
        String walletDir = requireWalletDir();
        ensureDirectoryExists(walletDir);

        // 1. Generate keypair via FISCO Java SDK
        CryptoSuite cryptoSuite = new CryptoSuite(gatewayService.getClient().getCryptoType());
        CryptoKeyPair keyPair = cryptoSuite.generateRandomKeyPair();

        String address = keyPair.getAddress().toLowerCase();
        String privateKeyHex = keyPair.getHexPrivateKey();
        String publicKeyHex = keyPair.getHexPublicKey();

        log.info("Generated wallet via Java SDK: address={}", address);

        // 2. Save PEM locally for SDK compatibility
        savePemFile(walletDir, address, keyPair);

        // 3. Import to WeBASE-Sign for private key management
        String signUserId = generateSignUserId(address);
        try {
            weBaseSignService.importUser(signUserId, privateKeyHex);
            log.info("Imported to WeBASE-Sign: signUserId={}, address={}", signUserId, address);
        } catch (Exception ex) {
            log.warn("Failed to import to WeBASE-Sign (non-fatal): {}", ex.getMessage());
            // Non-fatal: local PEM still works
        }

        // 4. Save metadata
        saveMetadata(walletDir, address, name, role, signUserId);

        // 5. Grant Auth role
        if (role != null && !role.isBlank()) {
            try {
                grantAuthRole(address, role);
            } catch (Exception ex) {
                log.warn("Could not grant role {} to {}: {}", role, address, ex.getMessage());
            }
        }

        return new WalletRecord(address, "0x" + publicKeyHex, name, role, signUserId);
    }

    /**
     * List all wallets from local metadata, enriched with PEM/WeBASE-Sign info.
     */
    public List<WalletRecord> listWallets() {
        String walletDir = properties.getTestWalletDir();
        if (walletDir == null || walletDir.isBlank()) {
            return List.of();
        }

        Path dir = Paths.get(walletDir).normalize();
        if (!Files.exists(dir) || !Files.isDirectory(dir)) {
            return List.of();
        }

        Map<String, Map<String, String>> meta = loadMetadata(walletDir);

        List<WalletRecord> records = new ArrayList<>();
        try (Stream<Path> stream = Files.list(dir)) {
            stream.filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().endsWith(".pem"))
                    .filter(p -> !p.getFileName().toString().endsWith(".public.pem"))
                    .sorted(Comparator.comparing(Path::toString))
                    .forEach(p -> {
                        String addr = pemPathToAddress(p);
                        Map<String, String> m = meta.getOrDefault(addr, Map.of());
                        loadPemRecord(p, addr, m, records);
                    });
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to scan wallet dir: " + ex.getMessage(), ex);
        }
        return records;
    }

    /**
     * Delete a wallet: remove PEM files, WeBASE-Sign user, and metadata.
     */
    public void deleteWallet(String address) {
        String walletDir = requireWalletDir();
        String normalizedAddress = address.toLowerCase();

        Path dir = Paths.get(walletDir).normalize();
        if (!Files.exists(dir) || !Files.isDirectory(dir)) {
            throw new IllegalArgumentException("Wallet directory not found: " + dir);
        }

        // Delete from WeBASE-Sign
        Map<String, Map<String, String>> meta = loadMetadata(walletDir);
        Map<String, String> entry = meta.get(normalizedAddress);
        if (entry != null) {
            String signUserId = entry.getOrDefault("signUserId", "");
            if (!signUserId.isBlank()) {
                try {
                    weBaseSignService.deleteUser(signUserId);
                    log.info("Deleted from WeBASE-Sign: signUserId={}", signUserId);
                } catch (Exception ex) {
                    log.warn("Failed to delete from WeBASE-Sign: {}", ex.getMessage());
                }
            }
        }

        // Delete PEM files
        boolean deleted = false;
        for (String suffix : new String[]{".pem", ".public.pem", ".pem.pub"}) {
            Path file = dir.resolve(normalizedAddress + suffix);
            try {
                if (Files.exists(file)) {
                    Files.delete(file);
                    deleted = true;
                    log.info("Deleted: {}", file);
                }
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to delete " + file + ": " + ex.getMessage(), ex);
            }
        }

        if (!deleted) {
            throw new IllegalArgumentException("Wallet not found: " + address);
        }

        // Remove from metadata
        removeMetadata(walletDir, normalizedAddress);
    }

    // ========== Private helpers ==========

    private String requireWalletDir() {
        String dir = properties.getTestWalletDir();
        if (dir == null || dir.isBlank()) {
            throw new IllegalArgumentException("Missing wallet dir (kx.fisco.test-wallet-dir)");
        }
        return dir;
    }

    private void ensureDirectoryExists(String walletDir) {
        Path dir = Paths.get(walletDir).normalize();
        if (!Files.exists(dir)) {
            try {
                Files.createDirectories(dir);
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to create wallet dir: " + ex.getMessage(), ex);
            }
        }
    }

    /**
     * Generate a signUserId for WeBASE-Sign from address.
     * WeBASE-Sign requires alphanumeric, max 64 chars.
     */
    private String generateSignUserId(String address) {
        // Use address without 0x prefix as signUserId (40 hex chars, unique, alphanumeric)
        String clean = address.startsWith("0x") ? address.substring(2) : address;
        return clean.toLowerCase();
    }

    /**
     * Save private key as PEM file using FISCO SDK format.
     */
    private void savePemFile(String walletDir, String address, CryptoKeyPair keyPair) {
        Path pemPath = Paths.get(walletDir).resolve(address + ".pem").normalize();
        try {
            // Build PEM content manually (FISCO BCOS PEM format)
            String privateKeyHex = keyPair.getHexPrivateKey();
            byte[] privateKeyBytes = hexToBytes(privateKeyHex);

            // PKCS#8 DER encoding for EC private key (secp256k1)
            // This is a simplified PEM that FISCO SDK's PEMKeyStore can read
            java.security.spec.PKCS8EncodedKeySpec pkcs8Spec =
                    new java.security.spec.PKCS8EncodedKeySpec(keyPair.getKeyPair().getPrivate().getEncoded());

            String base64 = java.util.Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(pkcs8Spec.getEncoded());
            String pemContent = "-----BEGIN PRIVATE KEY-----\n" + base64 + "\n-----END PRIVATE KEY-----\n";

            Files.writeString(pemPath, pemContent);
            log.info("Saved PEM: {}", pemPath);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to save PEM file: " + ex.getMessage(), ex);
        }
    }

    private byte[] hexToBytes(String hex) {
        String clean = hex.startsWith("0x") ? hex.substring(2) : hex;
        byte[] bytes = new byte[clean.length() / 2];
        for (int i = 0; i < bytes.length; i++) {
            bytes[i] = (byte) Integer.parseInt(clean.substring(i * 2, i * 2 + 2), 16);
        }
        return bytes;
    }

    private String pemPathToAddress(Path pemPath) {
        String filename = pemPath.getFileName().toString();
        return filename.substring(0, filename.length() - 4).toLowerCase();
    }

    private void loadPemRecord(Path path, String address, Map<String, String> meta, List<WalletRecord> records) {
        try {
            PEMKeyStore store = new PEMKeyStore(path.toString());
            String publicHex;
            try {
                publicHex = store.getHexedPublicKey();
            } catch (Exception e) {
                publicHex = "";
            }
            String name = meta.getOrDefault("name", "");
            String role = meta.getOrDefault("role", "");
            String signUserId = meta.getOrDefault("signUserId", "");
            records.add(new WalletRecord(address, "0x" + publicHex, name, role, signUserId));
        } catch (Exception ex) {
            log.warn("Skipping PEM {}: {}", path, ex.getMessage());
        }
    }

    // ========== Metadata (wallet-meta.json) ==========

    private Map<String, Map<String, String>> loadMetadata(String walletDir) {
        Path metaFile = Paths.get(walletDir).resolve(META_FILE);
        if (!Files.exists(metaFile)) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(metaFile.toFile(),
                    new TypeReference<Map<String, Map<String, String>>>() {});
        } catch (Exception ex) {
            log.warn("Could not read wallet-meta.json: {}", ex.getMessage());
            return new HashMap<>();
        }
    }

    private void saveMetadata(String walletDir, String address, String name, String role, String signUserId) {
        Map<String, Map<String, String>> meta = loadMetadata(walletDir);
        Map<String, String> entry = new LinkedHashMap<>();
        entry.put("name", name != null ? name : "");
        entry.put("role", role != null ? role : "");
        entry.put("signUserId", signUserId != null ? signUserId : "");
        meta.put(address.toLowerCase(), entry);

        Path metaFile = Paths.get(walletDir).resolve(META_FILE);
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(metaFile.toFile(), meta);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to write wallet-meta.json: " + ex.getMessage(), ex);
        }
    }

    private void removeMetadata(String walletDir, String address) {
        Map<String, Map<String, String>> meta = loadMetadata(walletDir);
        meta.remove(address.toLowerCase());

        Path metaFile = Paths.get(walletDir).resolve(META_FILE);
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(metaFile.toFile(), meta);
            log.info("Removed metadata for: {}", address);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to update wallet-meta.json: " + ex.getMessage(), ex);
        }
    }

    // ========== Auth role granting ==========

    private static final Map<String, String> ROLE_HASHES = new HashMap<>();
    static {
        ROLE_HASHES.put("bank",         "0x591fa5458fe051cc8c02c405479bd38e00713c98dbd3db209d982048f1e638fa");
        ROLE_HASHES.put("regulator",    "0x20b5f7ac978e5d6199de06401411960dfa81d2f762655f6206bdc61d46fc19e6");
        ROLE_HASHES.put("exchange",     "0x541943c4a49765b7940b4b1392c4b1f8ede6efd4e23572572987ae02e569a786");
        ROLE_HASHES.put("scenic",       "0xd381d6cec5c09ae4e4951c715a6ed8273b7b5e5201f379547dd129c126530654");
        ROLE_HASHES.put("market_maker", "0x75e5bf8b7de9fd9f24c97951733c6410a040b7a07b543096cb36c6dda365aa8b");
        ROLE_HASHES.put("consumer",     "0x9d56108290ea0bc9c5c59c3ad357dca9d1b29ed7f3ae1443bef2fa2159bdf5e8");
        ROLE_HASHES.put("admin",        "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775");
    }

    private void grantAuthRole(String address, String role) {
        String adminAddress = properties.getAdminAddress();
        if (adminAddress == null || adminAddress.isBlank()) {
            throw new IllegalArgumentException("Admin address not configured (kx.fisco.admin-address)");
        }

        String roleHash = ROLE_HASHES.get(role.toLowerCase());
        if (roleHash == null) {
            throw new IllegalArgumentException("Unknown role: " + role);
        }

        log.info("Granting role: {} to {} (hash: {})", role, address, roleHash);

        ContractSendRequest grantReq = new ContractSendRequest();
        grantReq.setContractName("Auth");
        grantReq.setMethod("grantRole(bytes32,address)");
        grantReq.setParams(List.of(roleHash, address));
        grantReq.setSignerAddress(adminAddress);

        Map<String, Object> result = contractExecutionService.send(grantReq);
        log.info("Grant role result: {}", result.get("txHash"));
    }
}
