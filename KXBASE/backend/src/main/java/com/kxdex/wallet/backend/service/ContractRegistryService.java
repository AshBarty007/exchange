package com.kxdex.wallet.backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kxdex.wallet.backend.config.FiscoProperties;

@Service
public class ContractRegistryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ContractRegistryService.class);

    private final ObjectMapper objectMapper;
    private final FiscoProperties properties;

    private final Map<String, String> contracts = new LinkedHashMap<>();

    public ContractRegistryService(ObjectMapper objectMapper, FiscoProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        reload();
    }

    public synchronized Map<String, String> getContracts() {
        return new LinkedHashMap<>(contracts);
    }

    public synchronized String resolveAddress(String contractName, String explicitAddress) {
        if (explicitAddress != null && !explicitAddress.isBlank()) {
            return explicitAddress.trim();
        }
        if (contractName == null || contractName.isBlank()) {
            throw new IllegalArgumentException("Missing contract name/address");
        }
        String address = contracts.get(contractName);
        if (address == null || address.isBlank()) {
            throw new IllegalArgumentException("Contract address not found for: " + contractName);
        }
        return address;
    }

    @SuppressWarnings("unchecked")
    public synchronized void reload() {
        contracts.clear();
        String file = properties.getContractsFile();
        if (file == null || file.isBlank()) {
            return;
        }

        Map<String, Object> root;
        try {
            root = readContractsFile(file);
        } catch (Exception ex) {
            LOGGER.warn("Failed to load contracts file '{}': {}", file, ex.getMessage());
            return;
        }

        if (root == null || root.isEmpty()) {
            LOGGER.warn("Contracts file is empty: {}", file);
            return;
        }

        Object contractNode = root.get("contracts");
        if (contractNode instanceof Map<?, ?>) {
            Map<?, ?> map = (Map<?, ?>) contractNode;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                contracts.put(String.valueOf(entry.getKey()), String.valueOf(entry.getValue()));
            }
        } else {
            for (Map.Entry<String, Object> entry : root.entrySet()) {
                contracts.put(entry.getKey(), String.valueOf(entry.getValue()));
            }
        }
        LOGGER.info("Loaded {} contracts from {}", contracts.size(), file);
    }

    /**
     * Read contracts JSON file. Supports both:
     * - "classpath:xxx.json" (from JAR/classpath)
     * - absolute or relative file path
     */
    private Map<String, Object> readContractsFile(String file) throws IOException {
        if (file.startsWith("classpath:")) {
            String resource = file.substring("classpath:".length());
            ClassPathResource cpr = new ClassPathResource(resource);
            if (!cpr.exists()) {
                LOGGER.warn("Classpath resource not found: {}", resource);
                return null;
            }
            try (InputStream is = cpr.getInputStream()) {
                return objectMapper.readValue(is, new TypeReference<>() {});
            }
        } else {
            Path path = Paths.get(file).normalize();
            if (!Files.exists(path)) {
                LOGGER.warn("Contracts file not found: {}", path);
                return null;
            }
            return objectMapper.readValue(path.toFile(), new TypeReference<>() {});
        }
    }
}
