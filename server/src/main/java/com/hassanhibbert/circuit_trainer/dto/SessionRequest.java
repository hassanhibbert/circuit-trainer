package com.hassanhibbert.circuit_trainer.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * Logs a completed workout. Either workoutId (a workout the user can see) or a free-text
 * workoutTitle identifies it; with workoutId, the stored title is taken from the workout.
 */
public record SessionRequest(
        Long workoutId,
        @Size(max = 120) String workoutTitle,
        // Optional: defaults to "now" on the server.
        Instant completedAt,
        @NotNull @Min(0) @Max(86400) Integer totalSeconds,
        @Size(max = 2000) String notes,
        @Size(max = 500) List<@Valid @NotNull SetRequest> sets
) {

    @AssertTrue(message = "either workoutId or workoutTitle is required")
    public boolean isWorkoutIdentified() {
        return workoutId != null || (workoutTitle != null && !workoutTitle.isBlank());
    }
}
