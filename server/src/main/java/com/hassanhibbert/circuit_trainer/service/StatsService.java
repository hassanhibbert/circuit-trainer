package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.stats.StatsResponse;
import com.hassanhibbert.circuit_trainer.dto.stats.WeightSummary;
import com.hassanhibbert.circuit_trainer.dto.stats.WorkoutStat;
import com.hassanhibbert.circuit_trainer.entity.BodyWeight;
import com.hassanhibbert.circuit_trainer.repository.BodyWeightRepository;
import com.hassanhibbert.circuit_trainer.repository.WorkoutSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class StatsService {
    private final WorkoutSessionRepository sessionRepository;
    private final BodyWeightRepository weightRepository;
    private final GoalService goalService;
    private final Clock clock;

    public StatsService(WorkoutSessionRepository sessionRepository, BodyWeightRepository weightRepository,
                        GoalService goalService, Clock clock) {
        this.sessionRepository = sessionRepository;
        this.weightRepository = weightRepository;
        this.goalService = goalService;
        this.clock = clock;
    }

    public StatsResponse summary(Long ownerId, ZoneId zone) {
        LocalDate today = WeekCalendar.today(clock, zone);
        List<WorkoutStat> workouts = sessionRepository.statsByWorkout(ownerId).stream()
                .map(stat -> stat.programWeeks() == null ? stat : stat.withCurrentWeek(
                        WeekCalendar.programWeek(stat.firstCompletedAt(), today, zone, stat.programWeeks())))
                .toList();

        return new StatsResponse(
                sessionRepository.countByOwnerId(ownerId),
                sessionRepository.sumTotalSeconds(ownerId),
                sessionRepository.countByOwnerIdAndCompletedAtGreaterThanEqual(ownerId,
                        WeekCalendar.startOfThisWeek(clock, zone)),
                sessionRepository.sumVolumeLb(ownerId),
                workouts,
                weightSummary(ownerId),
                goalService.list(ownerId, zone));
    }

    private WeightSummary weightSummary(Long ownerId) {
        Optional<BodyWeight> first = weightRepository.findFirstByOwnerIdOrderByMeasuredOnAsc(ownerId);
        Optional<BodyWeight> latest = weightRepository.findFirstByOwnerIdOrderByMeasuredOnDesc(ownerId);
        if (first.isEmpty() || latest.isEmpty()) {
            return null;
        }
        return new WeightSummary(weightRepository.countByOwnerId(ownerId),
                first.get().getWeightLb(), first.get().getMeasuredOn(),
                latest.get().getWeightLb(), latest.get().getMeasuredOn(),
                latest.get().getWeightLb().subtract(first.get().getWeightLb()),
                weightRepository.lowestWeight(ownerId));
    }
}
