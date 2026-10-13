package com.hassanhibbert.circuit_trainer.auth;

// the access token goes in the response body, the refresh token in a cookie
public record AuthResult(TokenResponse tokens, String refreshToken) {
}
