package com.hassanhibbert.circuit_trainer.auth;

public record TokenResponse(String accessToken, String tokenType, long expiresIn, String username, boolean readOnly) {
    public static TokenResponse bearer(String token, long expiresInSeconds, String username, boolean readOnly) {
        return new TokenResponse(token, "Bearer", expiresInSeconds, username, readOnly);
    }
}
