package com.hassanhibbert.circuit_trainer.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public record ImportRequest(@NotNull @Size(max = 5000) List<@Valid @NotNull Entry> entries) {
    public record Entry(
            @NotBlank @Size(max = 120) String workoutTitle,
            @NotNull Instant completedAt,
            @NotNull @Min(0) @Max(86400) Integer totalSeconds,
            @Size(max = 2000) String notes,
            @Size(max = 500) List<@Valid @NotNull SetRequest> sets
    ) {
    }
}
