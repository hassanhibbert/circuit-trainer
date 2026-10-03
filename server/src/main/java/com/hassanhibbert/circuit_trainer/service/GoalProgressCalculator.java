package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.GoalResponse.Progress;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure functions, no Spring, no database: the easiest kind of code to unit test, which is
 * exactly why the arithmetic lives here and not inside a service method that also runs queries.
 */
public final class GoalProgressCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private GoalProgressCalculator() {}

    /**
     * Fraction of the distance from start to target covered so far, 0-100. Direction-aware:
     * a goal below the start weight is a loss goal, above it a gain goal.
     */
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
        // (start - current) / (start - target): the sign works out for loss and gain goals alike.
        // compareTo, not equals: BigDecimal.equals treats 180.0 and 180.00 as different.
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
