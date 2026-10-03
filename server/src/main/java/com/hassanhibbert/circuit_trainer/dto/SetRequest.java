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

/** One performed set. Any of reps, weight and duration may be missing, but not all three. */
public record SetRequest(
        @NotBlank @Size(max = 120) String exerciseTitle,
        @Size(max = 60) String setLabel,
        @Min(0) @Max(1000) Integer reps,
        @DecimalMin("0.0") @DecimalMax("2000.0") @Digits(integer = 4, fraction = 1) BigDecimal weightLb,
        @Min(0) @Max(86400) Integer durationSeconds
) {

    /**
     * A cross-field rule on one object. Bean Validation treats an "isXxx()" method as a property
     * getter, so @AssertTrue here reports an error on the "measured" property.
     * Mirrors the CHECK constraint on session_sets: validation gives a readable 400, the CHECK is the backstop.
     */
    @AssertTrue(message = "a set needs reps, weightLb or durationSeconds")
    public boolean isMeasured() {
        return reps != null || weightLb != null || durationSeconds != null;
    }
}
