package com.hassanhibbert.circuit_trainer.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SetRequest(
        @NotBlank @Size(max = 120) String exerciseTitle,
        @Size(max = 60) String setLabel,
        @Min(0) @Max(1000) Integer reps,
        @DecimalMin("0.0") @DecimalMax("2000.0") @Digits(integer = 4, fraction = 1) BigDecimal weightLb,
        @Min(0) @Max(86400) Integer durationSeconds
) {
    @AssertTrue(message = "a set needs reps, weightLb or durationSeconds")
    public boolean isMeasured() {
        return reps != null || weightLb != null || durationSeconds != null;
    }
}
