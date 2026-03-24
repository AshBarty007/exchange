package com.kxdex.wallet.backend.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.kxdex.wallet.backend.config.WeBaseSignProperties;

/**
 * WeBASE-Sign HTTP client.
 * Manages wallet private keys via WeBASE-Sign service (AES encrypted in MySQL).
 */
@Service
public class WeBaseSignService {

    private static final Logger log = LoggerFactory.getLogger(WeBaseSignService.class);

    private final WeBaseSignProperties properties;
    private final RestTemplate restTemplate;

    public WeBaseSignService(WeBaseSignProperties properties, RestTemplate restTemplate) {
        this.properties = properties;
        this.restTemplate = restTemplate;
    }

    /**
     * Create a new user in WeBASE-Sign (WeBASE generates the keypair).
     * GET /user/newUser?signUserId=xxx&appId=xxx&encryptType=0
     *
     * @return response data map with signUserId, address, publicKey
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> createUser(String signUserId) {
        String url = properties.getUrl() + "/user/newUser?signUserId=" + signUserId
                + "&appId=" + properties.getAppId()
                + "&encryptType=" + properties.getEncryptType();
        log.info("WeBASE-Sign createUser: {}", url);

        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return extractData(response.getBody(), "createUser");
    }

    /**
     * Import an existing private key into WeBASE-Sign.
     * POST /user/newUser
     *
     * @param signUserId unique user identifier
     * @param privateKeyHex hex private key (without 0x prefix)
     * @return response data map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> importUser(String signUserId, String privateKeyHex) {
        String url = properties.getUrl() + "/user/newUser";
        log.info("WeBASE-Sign importUser: signUserId={}", signUserId);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("signUserId", signUserId);
        body.put("appId", properties.getAppId());
        body.put("privateKey", privateKeyHex);
        body.put("encryptType", properties.getEncryptType());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        return extractData(response.getBody(), "importUser");
    }

    /**
     * Get user info from WeBASE-Sign.
     * GET /user/{signUserId}/userInfo
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getUserInfo(String signUserId) {
        String url = properties.getUrl() + "/user/" + signUserId + "/userInfo";
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        return extractData(response.getBody(), "getUserInfo");
    }

    /**
     * List all users for our appId from WeBASE-Sign.
     * GET /user/list/{appId}/{pageNumber}/{pageSize}
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> listUsers(int pageNumber, int pageSize) {
        String url = properties.getUrl() + "/user/list/" + properties.getAppId()
                + "/" + pageNumber + "/" + pageSize;

        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        Map<String, Object> body = response.getBody();
        if (body == null) return Collections.emptyList();

        int code = body.get("code") != null ? ((Number) body.get("code")).intValue() : -1;
        if (code != 0) {
            log.warn("WeBASE-Sign listUsers error: {}", body.get("message"));
            return Collections.emptyList();
        }

        Object data = body.get("data");
        if (data instanceof List) {
            return (List<Map<String, Object>>) data;
        }
        return Collections.emptyList();
    }

    /**
     * Delete a user from WeBASE-Sign.
     * DELETE /user/ with body {"signUserId": "xxx"}
     */
    @SuppressWarnings("unchecked")
    public void deleteUser(String signUserId) {
        String url = properties.getUrl() + "/user";
        log.info("WeBASE-Sign deleteUser: signUserId={}", signUserId);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("signUserId", signUserId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        restTemplate.exchange(url, HttpMethod.DELETE, entity, Map.class);
    }

    /**
     * Sign a message hash via WeBASE-Sign.
     * POST /sign/hash with body {"signUserId": "xxx", "messageHash": "hex"}
     *
     * @return signature hex string
     */
    @SuppressWarnings("unchecked")
    public String signHash(String signUserId, String messageHashHex) {
        String url = properties.getUrl() + "/sign/hash";
        log.info("WeBASE-Sign signHash: signUserId={}", signUserId);

        String cleanHash = messageHashHex.startsWith("0x") ? messageHashHex.substring(2) : messageHashHex;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("signUserId", signUserId);
        body.put("messageHash", cleanHash);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
        Map<String, Object> data = extractData(response.getBody(), "signHash");

        Object signDataStr = data.get("signDataStr");
        if (signDataStr == null) {
            throw new IllegalStateException("WeBASE-Sign signHash returned no signature data");
        }
        return signDataStr.toString();
    }

    // ========== Helper ==========

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractData(Map body, String operation) {
        if (body == null) {
            throw new IllegalStateException("WeBASE-Sign " + operation + " returned null response");
        }
        int code = body.get("code") != null ? ((Number) body.get("code")).intValue() : -1;
        if (code != 0) {
            String message = body.get("message") != null ? body.get("message").toString() : "unknown error";
            throw new IllegalStateException("WeBASE-Sign " + operation + " failed (code=" + code + "): " + message);
        }
        Object data = body.get("data");
        if (data instanceof Map) {
            return (Map<String, Object>) data;
        }
        throw new IllegalStateException("WeBASE-Sign " + operation + " returned unexpected data type");
    }
}
