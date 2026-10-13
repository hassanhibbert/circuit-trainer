package com.hassanhibbert.circuit_trainer.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(Duration refreshTtl, boolean cookieSecure, RateLimit rateLimit) {

    public record RateLimit(int loginPerIpPerMinute, int loginPerUsernamePer15Minutes, int registerPerIpPerHour) {
    }
}
