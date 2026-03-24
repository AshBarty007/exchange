package com.kxdex.wallet.backend.util;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kxdex.wallet.backend.model.ContractMethodSignature;

public class AbiJsonBuilder {

    private final ObjectMapper objectMapper;

    public AbiJsonBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String buildFunctionAbi(ContractMethodSignature signature, List<String> outputTypes, boolean isView) {
        Map<String, Object> function = new LinkedHashMap<>();
        function.put("type", "function");
        function.put("name", signature.getMethodName());
        function.put("stateMutability", isView ? "view" : "nonpayable");
        function.put("inputs", buildTypedEntries(signature.getInputTypes(), "arg"));
        function.put("outputs", buildTypedEntries(outputTypes, "ret"));

        try {
            return objectMapper.writeValueAsString(List.of(function));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Failed to generate ABI json: " + e.getMessage(), e);
        }
    }

    private List<Map<String, Object>> buildTypedEntries(List<String> types, String namePrefix) {
        List<Map<String, Object>> entries = new ArrayList<>();
        if (types == null) {
            return entries;
        }

        for (int i = 0; i < types.size(); i++) {
            entries.add(buildTypedEntry(types.get(i), namePrefix + i));
        }
        return entries;
    }

    private Map<String, Object> buildTypedEntry(String rawType, String name) {
        String type = rawType == null ? "" : rawType.trim();
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("name", name);

        int tupleStart = type.indexOf("tuple(");
        if (tupleStart == 0 && type.endsWith(")")) {
            int bodyStart = "tuple(".length();
            int bodyEnd = findMatchingParen(type, bodyStart - 1);
            if (bodyEnd == type.length() - 1) {
                String tupleBody = type.substring(bodyStart, bodyEnd);
                entry.put("type", "tuple");
                entry.put("components", buildTypedEntries(splitTopLevel(tupleBody), name + "_"));
                return entry;
            }
        }

        if (tupleStart == 0 && type.contains(")") && type.endsWith("[]")) {
            int bodyStart = "tuple(".length();
            int bodyEnd = findMatchingParen(type, bodyStart - 1);
            if (bodyEnd > 0) {
                String suffix = type.substring(bodyEnd + 1);
                String tupleBody = type.substring(bodyStart, bodyEnd);
                entry.put("type", "tuple" + suffix);
                entry.put("components", buildTypedEntries(splitTopLevel(tupleBody), name + "_"));
                return entry;
            }
        }

        entry.put("type", type);
        return entry;
    }

    private int findMatchingParen(String source, int leftParenIndex) {
        int depth = 0;
        for (int i = leftParenIndex; i < source.length(); i++) {
            char ch = source.charAt(i);
            if (ch == '(') {
                depth++;
            } else if (ch == ')') {
                depth--;
                if (depth == 0) {
                    return i;
                }
            }
        }
        return -1;
    }

    private List<String> splitTopLevel(String source) {
        List<String> parts = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int depth = 0;
        for (int i = 0; i < source.length(); i++) {
            char ch = source.charAt(i);
            if (ch == '(') {
                depth++;
                current.append(ch);
                continue;
            }
            if (ch == ')') {
                depth--;
                current.append(ch);
                continue;
            }
            if (ch == ',' && depth == 0) {
                String token = current.toString().trim();
                if (!token.isEmpty()) {
                    parts.add(token);
                }
                current.setLength(0);
                continue;
            }
            current.append(ch);
        }

        String token = current.toString().trim();
        if (!token.isEmpty()) {
            parts.add(token);
        }
        return parts;
    }
}
