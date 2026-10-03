package com.hassanhibbert.circuit_trainer.dto;

/** skipped counts entries already present (same workout title and completion time). */
public record ImportResult(int added, int skipped) {
}
