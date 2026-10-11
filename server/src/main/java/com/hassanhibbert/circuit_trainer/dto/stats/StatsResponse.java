package com.hassanhibbert.circuit_trainer.dto.stats;

import com.hassanhibbert.circuit_trainer.dto.GoalResponse;

import java.math.BigDecimal;
import java.util.List;

public record StatsResponse(
        long totalSessions,
        long totalSeconds,
        long sessionsThisWeek,
        BigDecimal totalVolumeLb,
        List<WorkoutStat> workouts,
        WeightSummary weight,
        List<GoalResponse> goals
) {
}
