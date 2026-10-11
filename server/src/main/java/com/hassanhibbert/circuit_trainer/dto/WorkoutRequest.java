package com.hassanhibbert.circuit_trainer.dto;

import com.hassanhibbert.circuit_trainer.entity.WorkoutMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record WorkoutRequest(
        @NotBlank @Size(max = 120) String title,
        @Size(max = 4000) String description,
        @NotNull WorkoutMode mode,
        @Min(1) @Max(14) Integer sessionsPerWeek,
        @Min(1) @Max(52) Integer programWeeks,
        @NotEmpty @Size(max = 30) List<@Valid @NotNull Section> sections
) {
    public record Section(
            @Size(max = 3) List<@NotBlank @Size(max = 60) String> titleLines,
            @NotEmpty @Size(max = 200) List<@Valid @NotNull Exercise> exercises
    ) {
    }

    public record Exercise(
            @NotBlank @Size(max = 120) String title,
            @Size(max = 200) String modifier,
            @Size(max = 60) String setLabel,
            @Size(max = 60) String reps,
            @Min(1) @Max(1000) Integer targetReps,
            @Min(1) @Max(3600) Integer durationSeconds,
            @Min(0) @Max(3600) Integer restSeconds
    ) {
    }
}
