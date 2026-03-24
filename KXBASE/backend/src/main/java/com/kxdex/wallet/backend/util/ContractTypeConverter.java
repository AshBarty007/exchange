package com.kxdex.wallet.backend.util;

import java.lang.reflect.Method;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class ContractTypeConverter {

    private ContractTypeConverter() {
    }

    public static List<Object> convertParams(List<Object> rawParams, List<String> inputTypes) {
        if (rawParams == null || rawParams.isEmpty()) {
            return List.of();
        }
        if (inputTypes == null || inputTypes.size() != rawParams.size()) {
            return rawParams;
        }

        List<Object> converted = new ArrayList<>(rawParams.size());
        for (int i = 0; i < rawParams.size(); i++) {
            converted.add(convertValueByType(rawParams.get(i), inputTypes.get(i)));
        }
        return converted;
    }

    private static Object convertValueByType(Object raw, String type) {
        if (raw == null || type == null || type.isBlank()) {
            return raw;
        }

        String cleanedType = type.trim();
        if (cleanedType.endsWith("[]")) {
            String elementType = cleanedType.substring(0, cleanedType.length() - 2);
            if (raw instanceof List<?>) {
                List<?> list = (List<?>) raw;
                return list.stream().map(item -> convertValueByType(item, elementType)).collect(Collectors.toList());
            }
            return List.of(convertValueByType(raw, elementType));
        }

        if (cleanedType.startsWith("uint") || cleanedType.startsWith("int")) {
            if (raw instanceof BigInteger) {
                return raw;
            }
            if (raw instanceof java.math.BigDecimal) {
                return ((java.math.BigDecimal) raw).toBigInteger();
            }
            if (raw instanceof Number) {
                // Integer / Long are safe to use longValue(); Short/Byte are also fine.
                return BigInteger.valueOf(((Number) raw).longValue());
            }
            return new BigInteger(raw.toString());
        }

        if (cleanedType.equals("bool")) {
            if (raw instanceof Boolean) {
                return raw;
            }
            return Boolean.parseBoolean(raw.toString());
        }

        if (cleanedType.equals("string") || cleanedType.equals("address")) {
            return raw.toString();
        }

        // bytes / bytesN: the SDK's encodeMethodFromObject requires byte[] (not String)
        if (cleanedType.startsWith("bytes")) {
            if (raw instanceof byte[]) return raw;
            String hex = raw.toString().trim();
            if (hex.startsWith("0x") || hex.startsWith("0X")) hex = hex.substring(2);
            if (hex.isEmpty()) return new byte[0];
            if (hex.length() % 2 != 0) hex = "0" + hex;
            byte[] result = new byte[hex.length() / 2];
            for (int j = 0; j < result.length; j++) {
                result[j] = (byte) Integer.parseInt(hex.substring(j * 2, j * 2 + 2), 16);
            }
            return result;
        }

        // tuple/struct types are passed through as-is.
        if (cleanedType.startsWith("tuple")) {
            return raw;
        }

        if (raw instanceof Map<?, ?>) {
            return raw;
        }
        if (raw instanceof List<?>) {
            return raw;
        }
        return raw;
    }

    public static Object normalizeValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigInteger) {
            BigInteger bigInteger = (BigInteger) value;
            return bigInteger.toString();
        }
        if (value instanceof byte[]) {
            byte[] bytes = (byte[]) value;
            return "0x" + toHex(bytes);
        }
        if (value instanceof List<?>) {
            List<?> list = (List<?>) value;
            return list.stream().map(ContractTypeConverter::normalizeValue).collect(Collectors.toList());
        }
        if (value instanceof Map<?, ?>) {
            Map<?, ?> map = (Map<?, ?>) value;
            Map<String, Object> normalized = new LinkedHashMap<>();
            map.forEach((k, v) -> normalized.put(String.valueOf(k), normalizeValue(v)));
            return normalized;
        }

        Object sdkValue = unwrapSdkValue(value);
        if (sdkValue != value) {
            return normalizeValue(sdkValue);
        }

        return value;
    }

    private static Object unwrapSdkValue(Object value) {
        try {
            Method getValue = value.getClass().getMethod("getValue");
            return getValue.invoke(value);
        } catch (Exception ignore) {
            return value;
        }
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
