package com.hassanhibbert.circuit_trainer.dto;

import java.time.LocalDate;

/** Optional ?from=2026-07-01&to=2026-09-30 for GET /api/v1/weights. Both ends inclusive. */
public record WeightFilter(LocalDate from, LocalDate to) {
}
