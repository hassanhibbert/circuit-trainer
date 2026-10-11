package com.hassanhibbert.circuit_trainer.repository;

import java.time.Instant;

public record CompletionKey(String workoutTitle, Instant completedAt) {
}
