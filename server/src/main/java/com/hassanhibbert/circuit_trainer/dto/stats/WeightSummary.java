package com.hassanhibbert.circuit_trainer.dto.stats;

import java.math.BigDecimal;
import java.time.LocalDate;

/** First and latest weigh-ins, and the change between them (negative = lost weight). */
public record WeightSummary(long entries, BigDecimal startingLb, LocalDate startingOn, BigDecimal latestLb,
                            LocalDate latestOn, BigDecimal changeLb, BigDecimal lowestLb) {
}
