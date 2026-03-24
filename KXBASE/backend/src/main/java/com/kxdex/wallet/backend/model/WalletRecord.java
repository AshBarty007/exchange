package com.kxdex.wallet.backend.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class WalletRecord {

    private String address;
    private String publicKey;
    private String name;
    private String role;
    private String signUserId;

    public WalletRecord() {
    }

    public WalletRecord(String address, String publicKey, String name, String role, String signUserId) {
        this.address = address;
        this.publicKey = publicKey;
        this.name = name;
        this.role = role;
        this.signUserId = signUserId;
    }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPublicKey() { return publicKey; }
    public void setPublicKey(String publicKey) { this.publicKey = publicKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getSignUserId() { return signUserId; }
    public void setSignUserId(String signUserId) { this.signUserId = signUserId; }
}
