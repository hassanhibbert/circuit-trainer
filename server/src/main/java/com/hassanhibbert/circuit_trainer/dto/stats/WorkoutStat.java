package com.hassanhibbert.circuit_trainer.dto.stats;

import java.time.Instant;

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
