package com.kxdex.wallet.backend.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.kxdex.wallet.backend.config.FiscoProperties;
import com.kxdex.wallet.backend.model.ContractCompileRequest;

@Service
public class ContractCompilerService {

    private final FiscoProperties properties;

    public ContractCompilerService(FiscoProperties properties) {
        this.properties = properties;
    }

    public Map<String, Object> compileWithConsole(ContractCompileRequest request) {
        String consoleDir = nonEmpty(request.getConsoleDir(), properties.getConsoleDir());
        if (consoleDir == null || consoleDir.isBlank()) {
            throw new IllegalArgumentException("Missing console dir");
        }

        Path consolePath = Paths.get(consoleDir).normalize();
        if (!Files.isDirectory(consolePath)) {
            throw new IllegalArgumentException("Console dir not found: " + consolePath);
        }

        String contractsPath = nonEmpty(request.getContractsPath(), "../../contracts");
        String outputPath = nonEmpty(request.getOutputPath(), "target/generated-contracts");
        String packageName = nonEmpty(request.getPackageName(), "com.kxdex.wallet.backend.contracts");

        StringBuilder cmd = new StringBuilder();
        cmd.append("./contract2java.sh solidity")
                .append(" -s ").append(shellQuote(contractsPath))
                .append(" -o ").append(shellQuote(outputPath))
                .append(" -p ").append(shellQuote(packageName))
                .append(" -t 2");
        if (request.isEnableAsyncCall()) {
            cmd.append(" -e");
        }

        ProcessBuilder processBuilder = new ProcessBuilder("bash", "-lc", cmd.toString());
        processBuilder.directory(consolePath.toFile());
        processBuilder.redirectErrorStream(true);

        StringBuilder output = new StringBuilder();
        int exitCode;
        try {
            Process process = processBuilder.start();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append(System.lineSeparator());
                }
            }
            exitCode = process.waitFor();
        } catch (Exception ex) {
            throw new IllegalArgumentException("Compile command failed: " + ex.getMessage(), ex);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("command", cmd.toString());
        result.put("consoleDir", consolePath.toString());
        result.put("contractsPath", contractsPath);
        result.put("outputPath", outputPath);
        result.put("packageName", packageName);
        result.put("exitCode", exitCode);
        result.put("success", exitCode == 0);
        result.put("output", output.toString());
        return result;
    }

    private String nonEmpty(String preferred, String fallback) {
        if (preferred != null && !preferred.isBlank()) {
            return preferred.trim();
        }
        return fallback;
    }

    private String shellQuote(String value) {
        return "'" + value.replace("'", "'\"'\"'") + "'";
    }
}
