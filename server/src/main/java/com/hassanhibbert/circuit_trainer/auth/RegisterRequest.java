package com.hassanhibbert.circuit_trainer.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 3, max = 50)
        @Pattern(regexp = "^[a-zA-Z0-9_.-]+$", message = "may only contain letters, digits, '_', '.' and '-'")
        String username,
        @NotBlank @Size(min = 8, max = 72) String password
) {
}
