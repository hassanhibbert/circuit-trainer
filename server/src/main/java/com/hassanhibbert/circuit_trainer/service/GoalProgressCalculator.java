package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.GoalResponse.Progress;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class GoalProgressCalculator {
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private GoalProgressCalculator() {}

    public static Progress weight(BigDecimal start, BigDecimal current, BigDecimal target) {
        if (current == null) {
            return Progress.NONE;
        }
        if (start == null || start.compareTo(target) == 0) {
            boolean reached = start == null ? current.compareTo(target) == 0 : true;
            return new Progress(current, reached ? 100 : null, reached);
        }
        boolean losing = target.compareTo(start) < 0;
        boolean achieved = losing ? current.compareTo(target) <= 0 : current.compareTo(target) >= 0;
        BigDecimal covered = start.subtract(current).multiply(HUNDRED)
                .divide(start.subtract(target), 0, RoundingMode.HALF_UP);
        return new Progress(current, clamp(covered.intValue()), achieved);
    }

    public static Progress sessionsPerWeek(long sessionsThisWeek, BigDecimal target) {
        int targetSessions = target.intValue();
        int percent = (int) Math.min(100, sessionsThisWeek * 100 / targetSessions);
        return new Progress(BigDecimal.valueOf(sessionsThisWeek), percent, sessionsThisWeek >= targetSessions);
    }

    private static int clamp(int percent) {
        return Math.max(0, Math.min(100, percent));
    }
}
