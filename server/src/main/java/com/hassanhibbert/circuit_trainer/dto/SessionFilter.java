package com.hassanhibbert.circuit_trainer.dto;

import java.time.Instant;

public record SessionFilter(Long workoutId, Instant from, Instant to) {
}
