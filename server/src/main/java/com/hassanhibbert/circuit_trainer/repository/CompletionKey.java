package com.hassanhibbert.circuit_trainer.repository;

import java.time.Instant;

/** The natural key of a session, as selected by a JPQL constructor expression. */
public record CompletionKey(String workoutTitle, Instant completedAt) {
}
