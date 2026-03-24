package com.kxdex.wallet.backend.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ContractMethodSignature {

    private final String methodName;
    private final List<String> inputTypes;

    public ContractMethodSignature(String methodName, List<String> inputTypes) {
        this.methodName = methodName;
        this.inputTypes = inputTypes == null ? Collections.emptyList() : List.copyOf(inputTypes);
    }

    public String getMethodName() {
        return methodName;
    }

    public List<String> getInputTypes() {
        return inputTypes;
    }

    public static ContractMethodSignature parse(String signature) {
        if (signature == null || signature.isBlank()) {
            throw new IllegalArgumentException("Method signature is required");
        }

        String trimmed = signature.trim();
        int open = trimmed.indexOf('(');
        int close = trimmed.lastIndexOf(')');

        if (open <= 0 || close != trimmed.length() - 1 || close < open) {
            throw new IllegalArgumentException("Invalid method signature: " + signature);
        }

        String name = trimmed.substring(0, open).trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Method name is required: " + signature);
        }

        String paramsPart = trimmed.substring(open + 1, close).trim();
        if (paramsPart.isEmpty()) {
            return new ContractMethodSignature(name, Collections.emptyList());
        }

        return new ContractMethodSignature(name, splitParamTypes(paramsPart));
    }

    private static List<String> splitParamTypes(String paramsPart) {
        List<String> result = new ArrayList<>();
        int bracketDepth = 0;
        int tupleDepth = 0;
        int start = 0;

        for (int i = 0; i < paramsPart.length(); i++) {
            char c = paramsPart.charAt(i);
            if (c == '[') {
                bracketDepth++;
            } else if (c == ']') {
                bracketDepth--;
            } else if (c == '(') {
                tupleDepth++;
            } else if (c == ')') {
                tupleDepth--;
            } else if (c == ',' && bracketDepth == 0 && tupleDepth == 0) {
                addType(result, paramsPart.substring(start, i));
                start = i + 1;
            }
        }

        addType(result, paramsPart.substring(start));
        return result;
    }

    private static void addType(List<String> types, String type) {
        String cleaned = type.trim();
        if (!cleaned.isEmpty()) {
            types.add(cleaned);
        }
    }
}
