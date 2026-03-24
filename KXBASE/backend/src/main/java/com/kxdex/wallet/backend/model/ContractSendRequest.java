package com.kxdex.wallet.backend.model;

public class ContractSendRequest extends ContractCallRequest {

    /** 私钥十六进制（与 signerAddress 二选一）*/
    private String privateKey;

    /** 签名者地址，后端从 accounts 目录加载对应 pem（与 privateKey 二选一）*/
    private String signerAddress;

    public String getPrivateKey() { return privateKey; }
    public void setPrivateKey(String privateKey) { this.privateKey = privateKey; }

    public String getSignerAddress() { return signerAddress; }
    public void setSignerAddress(String signerAddress) { this.signerAddress = signerAddress; }

    public boolean hasPrivateKey() {
        return privateKey != null && !privateKey.isBlank();
    }

    public boolean hasSignerAddress() {
        return signerAddress != null && !signerAddress.isBlank();
    }
}
