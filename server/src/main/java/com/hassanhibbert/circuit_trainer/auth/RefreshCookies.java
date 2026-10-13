package com.hassanhibbert.circuit_trainer.auth;

import com.hassanhibbert.circuit_trainer.security.AuthProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

// httpOnly so page scripts can't read it, strict same-site and only sent to the auth endpoints
@Component
public class RefreshCookies {
    public static final String NAME = "refresh_token";
    static final String PATH = "/api/v1/auth";

    private final AuthProperties properties;

    public RefreshCookies(AuthProperties properties) {
        this.properties = properties;
    }

    public String create(String token) {
        return build(token, properties.refreshTtl());
    }

    public String clear() {
        return build("", Duration.ZERO);
    }

    private String build(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite("Strict")
                .path(PATH)
                .maxAge(maxAge)
                .build()
                .toString();
    }
}
