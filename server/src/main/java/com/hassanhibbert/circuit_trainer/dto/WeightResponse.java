package com.hassanhibbert.circuit_trainer.dto;

import com.hassanhibbert.circuit_trainer.entity.BodyWeight;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeightResponse(Long id, LocalDate measuredOn, BigDecimal weightLb, String note) {

    public static WeightResponse fromEntity(BodyWeight w) {
        return new WeightResponse(w.getId(), w.getMeasuredOn(), w.getWeightLb(), w.getNote());
    }
}
