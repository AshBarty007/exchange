package com.kxdex.wallet.backend.util;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

public final class FiatAmountConverter {

    private static final int FIAT_DECIMALS = 4;
    private static final BigDecimal FIAT_SCALE = BigDecimal.TEN.pow(FIAT_DECIMALS);

    private FiatAmountConverter() {
    }

    public static List<Object> normalizeFiatSendParams(String contractName, String methodName, List<Object> params) {
        if (params == null || params.isEmpty()) {
            return params;
        }
        if (methodName == null || methodName.isBlank()) {
            return params;
        }

        List<Object> normalized = new ArrayList<>(params);

        // FiatToken 合约的金额转换
        if ("FiatToken".equals(contractName)) {
            switch (methodName) {
                case "mint":
                case "burn":
                case "transfer":
                case "deposit":
                case "withdraw":
                    normalizeAt(normalized, 1);
                    break;
                case "transferWithPurpose":
                    normalizeAt(normalized, 1);
                    break;
                case "transferFrom":
                    normalizeAt(normalized, 2);
                    break;
                case "batchTransfer":
                    normalizeAt(normalized, 1);
                    break;
                default:
                    break;
            }
        }

        // Exchange 合约：createOrder 的 price 参数（index=2）支持小数转换
        // 参数顺序: orderType(0), ticketId(1), price(2), amount(3), signature(4)
        if ("Exchange".equals(contractName)) {
            switch (methodName) {
                case "createOrder":
                    normalizeAt(normalized, 2);
                    break;
                default:
                    break;
            }
        }

        return normalized;
    }

    private static void normalizeAt(List<Object> params, int index) {
        if (index < 0 || index >= params.size()) {
            return;
        }
        params.set(index, normalizeAmountValue(params.get(index)));
    }

    private static Object normalizeAmountValue(Object value) {
        if (value instanceof List<?>) {
            List<?> input = (List<?>) value;
            List<Object> output = new ArrayList<>(input.size());
            for (Object item : input) {
                output.add(normalizeAmountValue(item));
            }
            return output;
        }

        if (value == null) {
            return null;
        }

        String text = value.toString().trim();
        if (text.isEmpty() || !text.contains(".")) {
            return value;
        }
        if (!text.matches("^\\d+\\.\\d+$")) {
            throw new IllegalArgumentException("Invalid fiat amount: " + text);
        }

        BigDecimal amount = new BigDecimal(text);
        if (amount.signum() < 0) {
            throw new IllegalArgumentException("Fiat amount cannot be negative: " + text);
        }
        if (amount.scale() > FIAT_DECIMALS) {
            throw new IllegalArgumentException("Fiat amount supports up to " + FIAT_DECIMALS + " decimal places");
        }

        BigInteger raw = amount.multiply(FIAT_SCALE).toBigIntegerExact();
        return raw.toString();
    }
}
