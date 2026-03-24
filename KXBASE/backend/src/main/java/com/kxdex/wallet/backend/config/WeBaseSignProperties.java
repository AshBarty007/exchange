package com.kxdex.wallet.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "kx.webase-sign")
public class WeBaseSignProperties {

    private String url = "http://127.0.0.1:5004/WeBASE-Sign";
    private String appId = "kxdex";
    private int encryptType = 0;

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getAppId() { return appId; }
    public void setAppId(String appId) { this.appId = appId; }

    public int getEncryptType() { return encryptType; }
    public void setEncryptType(int encryptType) { this.encryptType = encryptType; }
}
