package com.hassanhibbert.circuit_trainer.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** A body-weight entry. measuredOn is a plain date ("2026-10-03"), weightLb has one decimal place. */
public record WeightRequest(
        @NotNull LocalDate measuredOn,
        @NotNull @DecimalMin("50.0") @DecimalMax("1000.0") @Digits(integer = 4, fraction = 1) BigDecimal weightLb,
        @Size(max = 500) String note
) {
}
