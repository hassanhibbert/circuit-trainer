package com.hassanhibbert.circuit_trainer.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Which browser origins may call the API, e.g. app.cors.allowed-origins=https://trainer.example.com.
 * A comma-separated property binds straight into the List.
 */
@ConfigurationProperties(prefix = "app.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
        if (allowedOrigins.contains("*")) {
            // "Any website may call this API with the user's token" is never what we want.
            throw new IllegalStateException("app.cors.allowed-origins must list explicit origins, not '*'");
        }
    }
}
