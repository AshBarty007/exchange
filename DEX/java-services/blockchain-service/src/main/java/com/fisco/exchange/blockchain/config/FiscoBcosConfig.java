package com.fisco.exchange.blockchain.config;

import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.config.ConfigOption;
import org.fisco.bcos.sdk.v3.config.model.ConfigProperty;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * FISCO BCOS 3.11 配置 - 连接远程服务器节点
 * 服务器: 192.168.120.32
 * 路径: /home/hqsk/fisco/
 */
@Configuration
public class FiscoBcosConfig {

    @Value("${blockchain.sdk.cert-path}")
    private String certPath;

    @Value("${blockchain.sdk.peers}")
    private String peers;

    @Value("${blockchain.group.id:group0}")
    private String groupId;

    @Value("${blockchain.sdk.disable-ssl:false}")
    private boolean disableSsl;

    @Bean
    public BcosSDK bcosSDK() throws Exception {
        ConfigProperty configProperty = new ConfigProperty();

        // Crypto material configuration (matching demo-app pattern)
        Map<String, Object> cryptoMaterial = new HashMap<>();
        cryptoMaterial.put("certPath", certPath);
        cryptoMaterial.put("useSMCrypto", "false");
        configProperty.setCryptoMaterial(cryptoMaterial);

        // Network configuration
        Map<String, Object> network = new HashMap<>();
        List<String> peerList = Arrays.asList(peers.split(","));
        network.put("peers", peerList);
        network.put("defaultGroup", groupId);
        configProperty.setNetwork(network);

        // Thread pool configuration (optional, matching demo-app)
        Map<String, Object> threadPool = new HashMap<>();
        threadPool.put("channelProcessorThreadSize", "16");
        threadPool.put("receiptProcessorThreadSize", "16");
        threadPool.put("maxBlockingQueueSize", "102400");
        configProperty.setThreadPool(threadPool);

        ConfigOption configOption = new ConfigOption(configProperty);
        return new BcosSDK(configOption);
    }

    @Bean
    @Lazy
    public Client client(BcosSDK bcosSDK) {
        return bcosSDK.getClient(groupId);
    }

    public String getGroupId() {
        return groupId;
    }

    @Bean
    @Lazy
    public CryptoKeyPair cryptoKeyPair(Client client) {
        return client.getCryptoSuite().getCryptoKeyPair();
    }
}
