package com.hassanhibbert.circuit_trainer.dto;

import java.time.Instant;

/**
 * Optional query-string filters for GET /api/v1/sessions, e.g. ?workoutId=3&from=2026-09-01T00:00:00Z.
 * Spring binds query parameters to the record's constructor; absent parameters are null.
 * The range is half-open: from is inclusive, to is exclusive.
 */
public record SessionFilter(Long workoutId, Instant from, Instant to) {
}
