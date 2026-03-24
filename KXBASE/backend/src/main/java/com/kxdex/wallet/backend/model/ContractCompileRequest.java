package com.kxdex.wallet.backend.model;

public class ContractCompileRequest {

    private String consoleDir;
    private String contractsPath;
    private String outputPath;
    private String packageName = "com.kxdex.wallet.backend.contracts";
    private boolean enableAsyncCall;

    public String getConsoleDir() {
        return consoleDir;
    }

    public void setConsoleDir(String consoleDir) {
        this.consoleDir = consoleDir;
    }

    public String getContractsPath() {
        return contractsPath;
    }

    public void setContractsPath(String contractsPath) {
        this.contractsPath = contractsPath;
    }

    public String getOutputPath() {
        return outputPath;
    }

    public void setOutputPath(String outputPath) {
        this.outputPath = outputPath;
    }

    public String getPackageName() {
        return packageName;
    }

    public void setPackageName(String packageName) {
        this.packageName = packageName;
    }

    public boolean isEnableAsyncCall() {
        return enableAsyncCall;
    }

    public void setEnableAsyncCall(boolean enableAsyncCall) {
        this.enableAsyncCall = enableAsyncCall;
    }
}
