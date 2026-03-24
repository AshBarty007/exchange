package com.kxdex.wallet.backend.service;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.fisco.bcos.sdk.v3.model.TransactionReceipt;
import org.fisco.bcos.sdk.v3.crypto.keypair.CryptoKeyPair;
import org.fisco.bcos.sdk.v3.transaction.manager.AssembleTransactionProcessor;
import org.fisco.bcos.sdk.v3.crypto.signature.SignatureResult;
import org.fisco.bcos.sdk.v3.transaction.model.dto.CallResponse;
import org.fisco.bcos.sdk.v3.transaction.model.dto.TransactionResponse;
import org.fisco.bcos.sdk.v3.utils.Hex;
import org.fisco.bcos.sdk.v3.utils.Numeric;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kxdex.wallet.backend.model.ContractCallRequest;
import com.kxdex.wallet.backend.model.ContractMethodSignature;
import com.kxdex.wallet.backend.model.ContractSendRequest;
import com.kxdex.wallet.backend.model.OrderSignRequest;
import com.kxdex.wallet.backend.util.AbiJsonBuilder;
import com.kxdex.wallet.backend.util.ContractTypeConverter;
import com.kxdex.wallet.backend.util.FiatAmountConverter;

@Service
public class ContractExecutionService {

    private final ObjectMapper objectMapper;
    private final ContractRegistryService contractRegistryService;
    private final FiscoGatewayService fiscoGatewayService;
    private final AbiJsonBuilder abiJsonBuilder;

    public ContractExecutionService(ObjectMapper objectMapper,
                                    ContractRegistryService contractRegistryService,
                                    FiscoGatewayService fiscoGatewayService) {
        this.objectMapper = objectMapper;
        this.contractRegistryService = contractRegistryService;
        this.fiscoGatewayService = fiscoGatewayService;
        this.abiJsonBuilder = new AbiJsonBuilder(objectMapper);
    }

    public Map<String, Object> call(ContractCallRequest request) {
        long start = System.currentTimeMillis();

        ContractMethodSignature signature = ContractMethodSignature.parse(request.getMethod());
        String contractAddress = contractRegistryService.resolveAddress(request.getContractName(), request.getContractAddress());
        List<Object> params = ContractTypeConverter.convertParams(request.getParams(), signature.getInputTypes());
        String abi = abiJsonBuilder.buildFunctionAbi(signature, request.getReturnTypes(), true);

        AssembleTransactionProcessor processor = fiscoGatewayService.createProcessor(null);
        CallResponse response;
        try {
            response = processor.sendCall(defaultString(request.getFrom()), contractAddress, abi, signature.getMethodName(), params);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Contract call failed: " + ex.getMessage(), ex);
        }

        List<?> output = normalizeList(response.getReturnObject());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mode", "call");
        result.put("contractName", request.getContractName());
        result.put("contractAddress", contractAddress);
        result.put("method", request.getMethod());
        result.put("methodName", signature.getMethodName());
        result.put("params", params);
        result.put("returnTypes", request.getReturnTypes());
        result.put("output", output);
        result.put("interaction", buildInteraction(start, request, params, response, null));
        return result;
    }

    public Map<String, Object> send(ContractSendRequest request) {
        long start = System.currentTimeMillis();

        ContractMethodSignature signature = ContractMethodSignature.parse(request.getMethod());
        String contractAddress = contractRegistryService.resolveAddress(request.getContractName(), request.getContractAddress());
        List<Object> normalizedParams = FiatAmountConverter.normalizeFiatSendParams(
                request.getContractName(),
                signature.getMethodName(),
                request.getParams()
        );
        List<Object> params = ContractTypeConverter.convertParams(normalizedParams, signature.getInputTypes());
        String abi = abiJsonBuilder.buildFunctionAbi(signature, request.getReturnTypes(), false);

        AssembleTransactionProcessor processor = request.hasSignerAddress()
                ? fiscoGatewayService.createProcessorFromAddress(request.getSignerAddress())
                : fiscoGatewayService.createProcessor(request.getPrivateKey());
        TransactionResponse response;
        try {
            response = processor.sendTransactionAndGetResponse(contractAddress, abi, signature.getMethodName(), params);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Contract send failed: " + ex.getMessage(), ex);
        }

        TransactionReceipt receipt = response.getTransactionReceipt();
        boolean reverted = response.getReturnCode() != 0;
        String revertMessage = response.getReturnMessage();

        // 尝试从 receipt.output 解码 revert reason
        // Error(string) selector = 0x08c379a0
        // Panic(uint256) selector = 0x4e487b71
        String decodedRevertReason = null;
        if (reverted && receipt != null) {
            String output = receipt.getOutput();
            if (output != null && output.startsWith("0x08c379a0")) {
                // Error(string): 跳过4字节selector+32字节offset+32字节length，取字符串内容
                try {
                    String hex = output.substring(2); // 去掉 0x
                    // offset=4+32=36字节=72字符, length在72+64=136处，内容从136+64=200开始
                    int lengthStart = 8 + 64 + 64; // selector(8) + offset(64) + length(64)
                    if (hex.length() >= lengthStart) {
                        int strLen = Integer.parseInt(hex.substring(8 + 64, 8 + 64 + 64).replaceAll("^0+", "0"), 16);
                        int contentStart = 8 + 64 + 64;
                        String strHex = hex.substring(contentStart, Math.min(contentStart + strLen * 2, hex.length()));
                        decodedRevertReason = new String(Hex.decode(strHex), StandardCharsets.UTF_8);
                    }
                } catch (Exception ignored) {}
            } else if (output != null && output.startsWith("0x4e487b71")) {
                // Panic(uint256)
                try {
                    String hex = output.substring(10); // 去掉selector
                    int panicCode = new BigInteger(hex.replaceAll("^0+", "0"), 16).intValue();
                    decodedRevertReason = "Panic(0x" + Integer.toHexString(panicCode) + "): " + decodePanicCode(panicCode);
                } catch (Exception ignored) {}
            }
        }

        String finalRevertMessage = decodedRevertReason != null ? decodedRevertReason
                : (reverted ? revertMessage : null);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mode", "send");
        result.put("contractName", request.getContractName());
        result.put("contractAddress", contractAddress);
        result.put("method", request.getMethod());
        result.put("methodName", signature.getMethodName());
        result.put("params", params);
        result.put("txHash", receipt == null ? "" : receipt.getTransactionHash());
        result.put("reverted", reverted);
        result.put("revertMessage", finalRevertMessage);
        result.put("receipt", normalizeValue(receipt));
        result.put("output", normalizeList(response.getReturnObject()));
        result.put("interaction", buildInteraction(start, request, params, null, response));
        return result;
    }

    public Map<String, Object> signOrder(OrderSignRequest request) {
        validateSignOrderRequest(request);

        String signerAddress = defaultString(request.getSignerAddress());
        String pemPath = fiscoGatewayService.resolvePemPath(signerAddress);
        CryptoKeyPair keyPair = fiscoGatewayService.loadKeyPairFromPem(pemPath);

        byte[] orderHashBytes = generateOrderHash(request, signerAddress);
        String orderHashHex = "0x" + Hex.toHexString(orderHashBytes);

        byte[] ethSignedHash = toEthSignedMessageHash(orderHashBytes);
        SignatureResult signatureResult = fiscoGatewayService.getClient().getCryptoSuite().sign(ethSignedHash, keyPair);
        String signature = normalizeSignature(signatureResult.convertToString());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("orderType", request.getOrderType());
        result.put("ticketId", request.getTicketId());
        result.put("price", request.getPrice());
        result.put("amount", request.getAmount());
        result.put("nonce", request.getNonce());
        result.put("signer", signerAddress);
        result.put("orderHash", orderHashHex);
        result.put("signature", signature);
        return result;
    }

    private void validateSignOrderRequest(OrderSignRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Order sign request is required");
        }
        if (request.getOrderType() == null || (request.getOrderType() != 0 && request.getOrderType() != 1)) {
            throw new IllegalArgumentException("orderType must be 0(BUY) or 1(SELL)");
        }
        if (request.getTicketId() == null || request.getTicketId() < 0) {
            throw new IllegalArgumentException("ticketId is invalid");
        }
        if (request.getPrice() == null || request.getPrice() <= 0) {
            throw new IllegalArgumentException("price is invalid");
        }
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new IllegalArgumentException("amount is invalid");
        }
        if (request.getNonce() == null || request.getNonce() < 0) {
            throw new IllegalArgumentException("nonce is invalid");
        }
        if (request.getSignerAddress() == null || request.getSignerAddress().isBlank()) {
            throw new IllegalArgumentException("signerAddress is required");
        }
    }

    private byte[] generateOrderHash(OrderSignRequest request, String signerAddress) {
        // 字段顺序与合约 createOrder 中的 keccak256(abi.encodePacked(...)) 保持一致:
        // ticketId, price, amount, account, nonce
        byte[] packed = concat(
                encodeUint256(BigInteger.valueOf(request.getTicketId())),
                encodeUint256(BigInteger.valueOf(request.getPrice())),
                encodeUint256(BigInteger.valueOf(request.getAmount())),
                encodeAddress(signerAddress),
                encodeUint256(BigInteger.valueOf(request.getNonce()))
        );
        return fiscoGatewayService.getClient().getCryptoSuite().hash(packed);
    }

    private byte[] toEthSignedMessageHash(byte[] messageHash) {
        if (messageHash == null || messageHash.length != 32) {
            throw new IllegalArgumentException("messageHash must be 32 bytes");
        }
        byte[] prefix = "\u0019Ethereum Signed Message:\n32".getBytes(StandardCharsets.UTF_8);
        byte[] payload = joinBytes(prefix, messageHash);
        return fiscoGatewayService.getClient().getCryptoSuite().hash(payload);
    }

    private byte[] joinBytes(byte[] first, byte[] second) {
        byte[] out = new byte[first.length + second.length];
        System.arraycopy(first, 0, out, 0, first.length);
        System.arraycopy(second, 0, out, first.length, second.length);
        return out;
    }

    private byte[] encodeUint256(BigInteger value) {
        if (value == null || value.signum() < 0) {
            throw new IllegalArgumentException("uint256 cannot be negative");
        }
        byte[] raw = value.toByteArray();
        if (raw.length > 33) {
            throw new IllegalArgumentException("uint256 overflows 32 bytes");
        }
        if (raw.length == 33 && raw[0] != 0) {
            throw new IllegalArgumentException("uint256 overflows 32 bytes");
        }
        byte[] normalized = raw.length == 33 ? java.util.Arrays.copyOfRange(raw, 1, 33) : raw;
        byte[] out = new byte[32];
        System.arraycopy(normalized, 0, out, 32 - normalized.length, normalized.length);
        return out;
    }

    private byte[] encodeAddress(String address) {
        String clean = Numeric.cleanHexPrefix(defaultString(address)).toLowerCase();
        if (clean.length() > 40 || clean.isBlank()) {
            throw new IllegalArgumentException("Invalid address: " + address);
        }
        if (!clean.matches("^[0-9a-f]+$")) {
            throw new IllegalArgumentException("Invalid address hex: " + address);
        }
        String padded = "0".repeat(40 - clean.length()) + clean;
        return Hex.decode(padded);
    }

    private byte[] concat(byte[]... parts) {
        int len = 0;
        for (byte[] part : parts) {
            len += part.length;
        }
        byte[] out = new byte[len];
        int offset = 0;
        for (byte[] part : parts) {
            System.arraycopy(part, 0, out, offset, part.length);
            offset += part.length;
        }
        return out;
    }

    private String normalizeSignature(String signatureHex) {
        String clean = Numeric.cleanHexPrefix(defaultString(signatureHex));
        if (clean.length() != 130) {
            throw new IllegalArgumentException("Invalid signature length: " + clean.length());
        }
        int v = Integer.parseInt(clean.substring(128, 130), 16);
        if (v < 27) {
            v += 27;
        }
        String normalized = clean.substring(0, 128) + String.format("%02x", v);
        return "0x" + normalized;
    }

    private Map<String, Object> buildInteraction(long start,
                                                 ContractCallRequest request,
                                                 List<Object> params,
                                                 CallResponse callResponse,
                                                 TransactionResponse txResponse) {
        Map<String, Object> requestPayload = new LinkedHashMap<>();
        requestPayload.put("contractName", request.getContractName());
        requestPayload.put("contractAddress", request.getContractAddress());
        requestPayload.put("method", request.getMethod());
        requestPayload.put("params", params);
        requestPayload.put("returnTypes", request.getReturnTypes());
        requestPayload.put("from", request.getFrom());
        if (request instanceof ContractSendRequest) {
            ContractSendRequest sendRequest = (ContractSendRequest) request;
            if (sendRequest.hasSignerAddress()) {
                requestPayload.put("fromPrivateKeyAddress", sendRequest.getSignerAddress());
            } else if (sendRequest.hasPrivateKey()) {
                requestPayload.put("fromPrivateKeyAddress", fiscoGatewayService.deriveAddress(sendRequest.getPrivateKey()));
            }
        }

        Map<String, Object> responsePayload = new LinkedHashMap<>();
        if (callResponse != null) {
            responsePayload.put("code", callResponse.getReturnCode());
            responsePayload.put("message", callResponse.getReturnMessage());
            responsePayload.put("returnObject", normalizeList(callResponse.getReturnObject()));
            responsePayload.put("rawValues", callResponse.getValues());
        }
        if (txResponse != null) {
            responsePayload.put("code", txResponse.getReturnCode());
            responsePayload.put("message", txResponse.getReturnMessage());
            responsePayload.put("returnObject", normalizeList(txResponse.getReturnObject()));
            responsePayload.put("values", txResponse.getValues());
            responsePayload.put("events", txResponse.getEvents());
            responsePayload.put("receipt", normalizeValue(txResponse.getTransactionReceipt()));
        }

        Map<String, Object> interaction = new LinkedHashMap<>();
        interaction.put("timestamp", System.currentTimeMillis());
        interaction.put("durationMs", System.currentTimeMillis() - start);
        interaction.put("request", requestPayload);
        interaction.put("response", responsePayload);
        return interaction;
    }

    private List<?> normalizeList(List<?> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().map(ContractTypeConverter::normalizeValue).collect(Collectors.toList());
    }

    private Object normalizeValue(Object value) {
        if (value == null) {
            return null;
        }
        Object normalized = ContractTypeConverter.normalizeValue(value);
        return objectMapper.convertValue(normalized, Object.class);
    }

    private String defaultString(String value) {
        return value == null ? "" : value;
    }

    private String decodePanicCode(int code) {
        switch (code) {
            case 0x01: return "assert failed";
            case 0x11: return "arithmetic overflow/underflow";
            case 0x12: return "division or modulo by zero";
            case 0x21: return "invalid enum value";
            case 0x31: return "pop on empty array";
            case 0x32: return "array index out of bounds";
            case 0x41: return "out of memory";
            case 0x51: return "call to uninitialized function";
            default:   return "unknown panic";
        }
    }
}
