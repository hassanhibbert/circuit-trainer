package com.hassanhibbert.circuit_trainer.auth;

public record TokenResponse(String accessToken, String tokenType, long expiresIn, String username) {
    public static TokenResponse bearer(String token, long expiresInSeconds, String username) {
        return new TokenResponse(token, "Bearer", expiresInSeconds, username);
    }
}
