package com.fisco.exchange.blockchain.service;

import com.fisco.exchange.blockchain.client.FiscoBcosClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 合约交互服务
 */
@Service
public class ContractService {

    @Autowired
    private FiscoBcosClient fiscoBcosClient;

    @Value("${blockchain.custody.contract}")
    private String custodyContract;

    @Value("${blockchain.asset.token.contract}")
    private String assetTokenContract;

    @Value("${blockchain.nft.contract}")
    private String nftContract;

    @Value("${blockchain.auth.contract}")
    private String authContract;

    @Value("${blockchain.account.contract}")
    private String accountContract;

    @Value("${blockchain.account.storage.contract}")
    private String accountStorageContract;

    @Value("${blockchain.ticket.storage.contract}")
    private String ticketStorageContract;

    @Value("${blockchain.fiat.storage.contract}")
    private String fiatStorageContract;

    // 角色名称到链上 keccak256 哈希的映射（与 Solidity keccak256(abi.encodePacked("ROLE_NAME")) 一致）
    private static final Map<String, String> ROLE_HASH_MAP = new java.util.HashMap<>();
    static {
        ROLE_HASH_MAP.put("regulator",    keccak256Hex("REGULATOR_ROLE"));
        ROLE_HASH_MAP.put("bank",         keccak256Hex("BANK_ROLE"));
        ROLE_HASH_MAP.put("exchange",     keccak256Hex("EXCHANGE_ADMIN_ROLE"));
        ROLE_HASH_MAP.put("scenic_spot",  keccak256Hex("SCENIC_OPERATOR_ROLE"));
        ROLE_HASH_MAP.put("market_maker", keccak256Hex("MARKET_MAKER_ROLE"));
        ROLE_HASH_MAP.put("consumer",     keccak256Hex("CONSUMER_ROLE"));
    }

    private static String keccak256Hex(String input) {
        try {
            org.bouncycastle.crypto.digests.KeccakDigest digest = new org.bouncycastle.crypto.digests.KeccakDigest(256);
            byte[] bytes = input.getBytes(StandardCharsets.UTF_8);
            digest.update(bytes, 0, bytes.length);
            byte[] result = new byte[32];
            digest.doFinal(result, 0);
            return "0x" + org.apache.commons.codec.binary.Hex.encodeHexString(result);
        } catch (Exception e) {
            throw new RuntimeException("keccak256 failed for: " + input, e);
        }
    }

    @PostConstruct
    public void init() {
        fiscoBcosClient.registerAbi(custodyContract, "ExchangeCustody");
        fiscoBcosClient.registerAbi(assetTokenContract, "AssetToken");
        fiscoBcosClient.registerAbi(nftContract, "NFTTicket");
        fiscoBcosClient.registerAbi(authContract, "Auth");
        fiscoBcosClient.registerAbi(accountContract, "Account");
        System.out.println("ContractService ABI registered:");
        System.out.println("  Auth: " + authContract);
        System.out.println("  Account: " + accountContract);
        System.out.println("  AccountStorage: " + accountStorageContract);
        System.out.println("  TicketStorage: " + ticketStorageContract);
        System.out.println("  FiatStorage: " + fiatStorageContract);
    }

    /**
     * 在链上为钱包地址授予角色
     * @param walletAddress 钱包地址
     * @param roleName 角色名 (scenic_spot / bank / market_maker / exchange / regulator)
     * @return txHash
     */
    public String grantRole(String walletAddress, String roleName) {
        String roleHash = ROLE_HASH_MAP.get(roleName);
        if (roleHash == null) {
            throw new IllegalArgumentException("Unknown role: " + roleName);
        }
        return fiscoBcosClient.sendTransaction(authContract, "grantRole", roleHash, walletAddress);
    }

    /**
     * 获取所有合约地址（用于前端系统设置展示）
     */
    public Map<String, String> getContractAddresses() {
        Map<String, String> addresses = new java.util.LinkedHashMap<>();
        addresses.put("Auth", authContract);
        addresses.put("Account", accountContract);
        addresses.put("AccountStorage", accountStorageContract);
        addresses.put("TicketStorage", ticketStorageContract);
        addresses.put("FiatStorage", fiatStorageContract);
        addresses.put("FiatToken", assetTokenContract);
        addresses.put("Ticket", nftContract);
        addresses.put("Exchange", custodyContract);
        return addresses;
    }

    /**
     * 批量铸造NFT门票
     */
    public String batchMintTickets(
        String ticketType,
        BigDecimal price,
        long validUntil,
        int count
    ) {
        return fiscoBcosClient.sendTransaction(
            nftContract,
            "batchMint",
            ticketType,
            price.toBigInteger(),
            BigInteger.valueOf(validUntil),
            BigInteger.valueOf(count)
        );
    }

    /**
     * 提交存款证明
     */
    public String submitDepositProof(
        String marketMakerAddress,
        BigDecimal amount,
        String proofHash
    ) {
        return fiscoBcosClient.sendTransaction(
            assetTokenContract,
            "submitDepositProof",
            marketMakerAddress,
            amount.toBigInteger(),
            proofHash
        );
    }

    /**
     * 基于存款证明铸造资金凭证
     */
    public String mintAssetToken(String proofId) {
        return fiscoBcosClient.sendTransaction(
            assetTokenContract,
            "mintWithProof",
            proofId
        );
    }

    /**
     * 批量清算
     */
    public String batchSettle(
        List<String> buyers,
        List<String> sellers,
        List<BigDecimal> amounts,
        List<Long> tokenIds
    ) {
        List<BigInteger> bigAmounts = new ArrayList<>();
        for (BigDecimal a : amounts) {
            bigAmounts.add(a.toBigInteger());
        }
        List<BigInteger> bigTokenIds = new ArrayList<>();
        for (Long id : tokenIds) {
            bigTokenIds.add(BigInteger.valueOf(id));
        }

        return fiscoBcosClient.sendTransaction(
            custodyContract,
            "batchSettle",
            buyers,
            sellers,
            assetTokenContract,
            bigAmounts,
            nftContract,
            bigTokenIds
        );
    }

    /**
     * 查询代币余额
     */
    public BigDecimal getTokenBalance(String userAddress) {
        String result = fiscoBcosClient.callContract(
            custodyContract,
            "getTokenBalance",
            userAddress, assetTokenContract
        );
        try {
            if (result != null && !result.isEmpty()) {
                // SDK 返回 JSON 格式 ["value"]，解析第一个元素
                String cleaned = result.replaceAll("[\\[\\]\"]", "").trim();
                if (!cleaned.isEmpty() && !cleaned.equals("0x")) {
                    return new BigDecimal(new BigInteger(cleaned));
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to parse token balance: " + e.getMessage());
        }
        return BigDecimal.ZERO;
    }

    /**
     * 查询NFT持有
     */
    public List<Long> getNFTTokens(String userAddress) {
        String result = fiscoBcosClient.callContract(
            custodyContract,
            "getNFTTokens",
            userAddress, nftContract
        );
        List<Long> tokenIds = new ArrayList<>();
        try {
            if (result != null && !result.isEmpty()) {
                // SDK 返回 JSON 格式 [[id1, id2, ...]]
                String cleaned = result.replaceAll("[\\[\\]\"]", "").trim();
                if (!cleaned.isEmpty()) {
                    for (String id : cleaned.split(",")) {
                        String trimmed = id.trim();
                        if (!trimmed.isEmpty()) {
                            tokenIds.add(Long.parseLong(trimmed));
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to parse NFT tokens: " + e.getMessage());
        }
        return tokenIds;
    }

    /**
     * 提取资金凭证到银行
     */
    public String withdrawToBank(
        String userAddress,
        BigDecimal amount,
        String bankAddress
    ) {
        return fiscoBcosClient.sendTransaction(
            assetTokenContract,
            "withdrawToBank",
            amount.toBigInteger(),
            bankAddress
        );
    }

    /**
     * 查询交易回执
     */
    public FiscoBcosClient.TransactionReceiptDTO getTransactionReceipt(String txHash) {
        return fiscoBcosClient.getTransactionReceipt(txHash);
    }

    /**
     * 获取最新区块号
     */
    public long getBlockNumber() {
        return fiscoBcosClient.getBlockNumber();
    }
}
