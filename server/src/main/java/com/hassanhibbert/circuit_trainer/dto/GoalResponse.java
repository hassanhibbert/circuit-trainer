package com.hassanhibbert.circuit_trainer.dto;

import com.hassanhibbert.circuit_trainer.entity.Goal;
import com.hassanhibbert.circuit_trainer.entity.GoalType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GoalResponse(
        Long id,
        GoalType type,
        BigDecimal targetValue,
        BigDecimal startValue,
        LocalDate startDate,
        LocalDate targetDate,
        Progress progress
) {
    public record Progress(BigDecimal currentValue, Integer percent, boolean achieved) {
        public static final Progress NONE = new Progress(null, null, false);
    }

    public static GoalResponse fromEntity(Goal g, BigDecimal effectiveStart, Progress progress) {
        return new GoalResponse(g.getId(), g.getType(), g.getTargetValue(), effectiveStart,
                g.getStartDate(), g.getTargetDate(), progress);
    }
}
