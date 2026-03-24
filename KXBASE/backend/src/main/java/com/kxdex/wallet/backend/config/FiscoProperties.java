package com.kxdex.wallet.backend.config;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.io.ClassPathResource;

@ConfigurationProperties(prefix = "kx.fisco")
public class FiscoProperties implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(FiscoProperties.class);

    private String group = "group0";
    private List<String> peers = new ArrayList<>();
    private String certPath;
    private boolean useSmCrypto;
    private boolean disableSsl = true;
    private String defaultPrivateKey;
    private String contractsFile;
    private String testWalletDir;
    private String consoleDir;
    private String adminAddress;

    @Override
    public void afterPropertiesSet() {
        // Resolve classpath: prefix to actual filesystem path
        testWalletDir = resolveClasspath(testWalletDir, "test-wallet-dir");
        certPath = resolveClasspath(certPath, "cert-path");
    }

    private String resolveClasspath(String path, String propertyName) {
        if (path != null && path.startsWith("classpath:")) {
            String resourcePath = path.substring("classpath:".length());
            try {
                ClassPathResource resource = new ClassPathResource(resourcePath);
                String resolved = resource.getFile().getAbsolutePath();
                log.info("Resolved {}: {} -> {}", propertyName, path, resolved);
                return resolved;
            } catch (Exception ex) {
                log.warn("Could not resolve classpath resource '{}' for {}: {}. "
                        + "If running from JAR, set kx.fisco.{} to an absolute path.",
                        path, propertyName, ex.getMessage(), propertyName);
            }
        }
        return path;
    }

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public List<String> getPeers() {
        return peers;
    }

    public void setPeers(List<String> peers) {
        this.peers = peers;
    }

    public String getCertPath() {
        return certPath;
    }

    public void setCertPath(String certPath) {
        this.certPath = certPath;
    }

    public boolean isUseSmCrypto() {
        return useSmCrypto;
    }

    public void setUseSmCrypto(boolean useSmCrypto) {
        this.useSmCrypto = useSmCrypto;
    }

    public boolean isDisableSsl() {
        return disableSsl;
    }

    public void setDisableSsl(boolean disableSsl) {
        this.disableSsl = disableSsl;
    }

    public String getDefaultPrivateKey() {
        return defaultPrivateKey;
    }

    public void setDefaultPrivateKey(String defaultPrivateKey) {
        this.defaultPrivateKey = defaultPrivateKey;
    }

    public String getContractsFile() {
        return contractsFile;
    }

    public void setContractsFile(String contractsFile) {
        this.contractsFile = contractsFile;
    }

    public String getTestWalletDir() {
        return testWalletDir;
    }

    public void setTestWalletDir(String testWalletDir) {
        this.testWalletDir = testWalletDir;
    }

    public String getConsoleDir() { return consoleDir; }
    public void setConsoleDir(String consoleDir) { this.consoleDir = consoleDir; }

    public String getAdminAddress() { return adminAddress; }
    public void setAdminAddress(String adminAddress) { this.adminAddress = adminAddress; }
}
