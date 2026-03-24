package com.kxdex.wallet.backend.config;

import java.util.HashMap;
import java.util.Map;

import org.fisco.bcos.sdk.v3.BcosSDK;
import org.fisco.bcos.sdk.v3.client.Client;
import org.fisco.bcos.sdk.v3.config.ConfigOption;
import org.fisco.bcos.sdk.v3.config.model.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FiscoConfig {

    private static final Logger LOGGER = LoggerFactory.getLogger(FiscoConfig.class);

    @Bean(destroyMethod = "stopAll")
    public BcosSDK bcosSDK(FiscoProperties properties) throws Exception {
        ConfigProperty configProperty = new ConfigProperty();

        Map<String, Object> cryptoMaterial = new HashMap<>();
        cryptoMaterial.put("certPath", properties.getCertPath());
        cryptoMaterial.put("useSMCrypto", String.valueOf(properties.isUseSmCrypto()));
        cryptoMaterial.put("disableSsl", String.valueOf(properties.isDisableSsl()));
        configProperty.setCryptoMaterial(cryptoMaterial);

        Map<String, Object> network = new HashMap<>();
        network.put("peers", properties.getPeers());
        network.put("defaultGroup", properties.getGroup());
        configProperty.setNetwork(network);

        Map<String, Object> account = new HashMap<>();
        account.put("keyStoreDir", "account");
        account.put("accountAddress", "");
        account.put("accountFileFormat", "pem");
        account.put("password", "");
        account.put("accountFilePath", "");
        configProperty.setAccount(account);

        Map<String, Object> threadPool = new HashMap<>();
        threadPool.put("channelProcessorThreadSize", "16");
        threadPool.put("receiptProcessorThreadSize", "16");
        threadPool.put("maxBlockingQueueSize", "102400");
        configProperty.setThreadPool(threadPool);

        ConfigOption configOption = new ConfigOption(configProperty);
        BcosSDK sdk = new BcosSDK(configOption);

        LOGGER.info("FISCO SDK initialized. group={}, peers={}, certPath={}",
                properties.getGroup(), properties.getPeers(), properties.getCertPath());

        return sdk;
    }

    @Bean
    public Client client(BcosSDK sdk, FiscoProperties properties) throws Exception {
        return sdk.getClient(properties.getGroup());
    }
}
