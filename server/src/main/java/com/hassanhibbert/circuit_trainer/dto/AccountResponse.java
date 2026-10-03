package com.hassanhibbert.circuit_trainer.dto;

import java.time.Instant;

public record AccountResponse(Long id, String username, Instant createdAt) {
}
