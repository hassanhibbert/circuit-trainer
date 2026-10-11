package com.hassanhibbert.circuit_trainer.dto;

import com.hassanhibbert.circuit_trainer.entity.GoalType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GoalRequest(
        @NotNull GoalType type,
        @NotNull @DecimalMin("1.0") @DecimalMax("1000.0") @Digits(integer = 4, fraction = 1) BigDecimal targetValue,
        @DecimalMin("50.0") @DecimalMax("1000.0") @Digits(integer = 4, fraction = 1) BigDecimal startValue,
        LocalDate startDate,
        LocalDate targetDate
) {
}
