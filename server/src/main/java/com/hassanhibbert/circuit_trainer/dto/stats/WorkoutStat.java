package com.hassanhibbert.circuit_trainer.dto.stats;

import java.time.Instant;

/**
 * Per-workout numbers. Built in two steps: the repository fills the aggregate columns via a
 * JPQL constructor expression (the 6-argument constructor), then the stats service adds
 * currentWeek, which depends on today's date in the user's time zone.
 */
public record WorkoutStat(Long workoutId, String title, long timesCompleted, Instant firstCompletedAt,
                          Instant lastCompletedAt, Integer programWeeks, Integer currentWeek) {

    public WorkoutStat(Long workoutId, String title, long timesCompleted, Instant firstCompletedAt,
                       Instant lastCompletedAt, Integer programWeeks) {
        this(workoutId, title, timesCompleted, firstCompletedAt, lastCompletedAt, programWeeks, null);
    }

    public WorkoutStat withCurrentWeek(Integer week) {
        return new WorkoutStat(workoutId, title, timesCompleted, firstCompletedAt, lastCompletedAt, programWeeks, week);
    }
}
