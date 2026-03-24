package com.kxdex.wallet.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class WalletBackendApplication {

    static {
        // FISCO node TLS handshake on Java 11 needs secp256k1 enabled in named groups.
        String namedGroups = System.getProperty("jdk.tls.namedGroups");
        if (namedGroups == null || namedGroups.isBlank()) {
            System.setProperty("jdk.tls.namedGroups", "secp256k1");
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(WalletBackendApplication.class, args);
    }
}
