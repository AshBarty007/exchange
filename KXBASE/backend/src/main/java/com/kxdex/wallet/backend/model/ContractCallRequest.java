package com.kxdex.wallet.backend.model;

import java.util.ArrayList;
import java.util.List;

import javax.validation.constraints.NotBlank;

public class ContractCallRequest {

    private String contractName;
    private String contractAddress;

    @NotBlank
    private String method;

    private List<Object> params = new ArrayList<>();
    private List<String> returnTypes = new ArrayList<>();
    private String from;

    public String getContractName() {
        return contractName;
    }

    public void setContractName(String contractName) {
        this.contractName = contractName;
    }

    public String getContractAddress() {
        return contractAddress;
    }

    public void setContractAddress(String contractAddress) {
        this.contractAddress = contractAddress;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public List<Object> getParams() {
        return params;
    }

    public void setParams(List<Object> params) {
        this.params = params == null ? new ArrayList<>() : params;
    }

    public List<String> getReturnTypes() {
        return returnTypes;
    }

    public void setReturnTypes(List<String> returnTypes) {
        this.returnTypes = returnTypes == null ? new ArrayList<>() : returnTypes;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }
}
