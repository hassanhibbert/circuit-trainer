package com.hassanhibbert.circuit_trainer.dto;

import com.hassanhibbert.circuit_trainer.entity.GoalType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * TARGET_WEIGHT: targetValue is a weight in lb; startValue (optional) is the baseline, which
 * defaults to the latest logged weight. SESSIONS_PER_WEEK: targetValue is a whole number of workouts.
 */
public record GoalRequest(
        @NotNull GoalType type,
        @NotNull @DecimalMin("1.0") @DecimalMax("1000.0") @Digits(integer = 4, fraction = 1) BigDecimal targetValue,
        @DecimalMin("50.0") @DecimalMax("1000.0") @Digits(integer = 4, fraction = 1) BigDecimal startValue,
        // Optional: defaults to today.
        LocalDate startDate,
        LocalDate targetDate
) {
}
