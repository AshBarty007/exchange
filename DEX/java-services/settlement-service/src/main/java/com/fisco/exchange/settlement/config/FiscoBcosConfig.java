package com.fisco.exchange.settlement.config;

import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.config.ConfigOption;
import org.fisco.bcos.sdk.v3.config.model.ConfigProperty;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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

        Map<String, Object> cryptoMaterial = new HashMap<>();
        if (!disableSsl) {
            cryptoMaterial.put("certPath", certPath);
        }
        cryptoMaterial.put("disableSsl", String.valueOf(disableSsl));
        configProperty.setCryptoMaterial(cryptoMaterial);

        Map<String, Object> network = new HashMap<>();
        List<String> peerList = Arrays.asList(peers.split(","));
        network.put("peers", peerList);
        configProperty.setNetwork(network);

        ConfigOption configOption = new ConfigOption(configProperty);
        return new BcosSDK(configOption);
    }

    @Bean
    public Client client(BcosSDK bcosSDK) {
        return bcosSDK.getClient(groupId);
    }

    public String getGroupId() {
        return groupId;
    }

    @Bean
    public CryptoKeyPair cryptoKeyPair(Client client) {
        return client.getCryptoSuite().getCryptoKeyPair();
    }
}
