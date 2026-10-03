package com.hassanhibbert.circuit_trainer.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Binds app.jwt.* from application.properties into a typed, immutable object.
 * The compact constructor runs on binding, so a missing or weak secret stops the app
 * at startup instead of surfacing as a confusing error on the first login.
 */
@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(String secret, Duration ttl, String issuer) {

    public JwtProperties {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "app.jwt.secret (env JWT_SECRET) must be set and at least 32 bytes for HS256");
        }
    }
}
