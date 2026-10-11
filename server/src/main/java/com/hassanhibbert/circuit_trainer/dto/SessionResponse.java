package com.hassanhibbert.circuit_trainer.dto;

import com.hassanhibbert.circuit_trainer.entity.SessionSet;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSession;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record SessionResponse(
        Long id,
        Long workoutId,
        String workoutTitle,
        Instant completedAt,
        Integer totalSeconds,
        String notes,
        BigDecimal volumeLb,
        List<Set> sets
) {
    public record Set(String exerciseTitle, String setLabel, Integer reps, BigDecimal weightLb,
                      Integer durationSeconds) {
        static Set fromEntity(SessionSet s) {
            return new Set(s.getExerciseTitle(), s.getSetLabel(), s.getReps(), s.getWeightLb(), s.getDurationSeconds());
        }
    }

    public static SessionResponse fromEntity(WorkoutSession s) {
        Long workoutId = s.getWorkout() == null ? null : s.getWorkout().getId();
        return new SessionResponse(s.getId(), workoutId, s.getWorkoutTitle(), s.getCompletedAt(),
                s.getTotalSeconds(), s.getNotes(), s.volumeLb(),
                s.getSets().stream().map(Set::fromEntity).toList());
    }
}
