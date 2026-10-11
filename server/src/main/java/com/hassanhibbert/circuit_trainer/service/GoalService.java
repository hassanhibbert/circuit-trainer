package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.GoalRequest;
import com.hassanhibbert.circuit_trainer.dto.GoalResponse;
import com.hassanhibbert.circuit_trainer.entity.BodyWeight;
import com.hassanhibbert.circuit_trainer.entity.Goal;
import com.hassanhibbert.circuit_trainer.entity.GoalType;
import com.hassanhibbert.circuit_trainer.exception.BusinessRuleException;
import com.hassanhibbert.circuit_trainer.exception.ResourceNotFoundException;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import com.hassanhibbert.circuit_trainer.repository.BodyWeightRepository;
import com.hassanhibbert.circuit_trainer.repository.GoalRepository;
import com.hassanhibbert.circuit_trainer.repository.WorkoutSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class GoalService {
    static final int MAX_GOALS = 20;
    static final int MAX_SESSIONS_PER_WEEK = 21;

    private final GoalRepository goalRepository;
    private final BodyWeightRepository weightRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final AppUserRepository appUserRepository;
    private final Clock clock;

    public GoalService(GoalRepository goalRepository, BodyWeightRepository weightRepository,
                       WorkoutSessionRepository sessionRepository, AppUserRepository appUserRepository, Clock clock) {
        this.goalRepository = goalRepository;
        this.weightRepository = weightRepository;
        this.sessionRepository = sessionRepository;
        this.appUserRepository = appUserRepository;
        this.clock = clock;
    }

    public List<GoalResponse> list(Long ownerId, ZoneId zone) {
        ProgressInputs inputs = inputs(ownerId, zone);
        return goalRepository.findByOwnerIdOrderByIdAsc(ownerId).stream()
                .map(goal -> toResponse(goal, inputs, ownerId))
                .toList();
    }

    public GoalResponse get(Long id, Long ownerId, ZoneId zone) {
        return toResponse(getEntity(id, ownerId), inputs(ownerId, zone), ownerId);
    }

    @Transactional
    public GoalResponse create(GoalRequest request, Long ownerId, ZoneId zone) {
        LocalDate startDate = request.startDate() != null ? request.startDate() : WeekCalendar.today(clock, zone);
        checkRules(request, startDate);
        if (goalRepository.countByOwnerId(ownerId) >= MAX_GOALS) {
            throw new BusinessRuleException("You can have at most " + MAX_GOALS + " goals");
        }
        Goal goal = new Goal(appUserRepository.getReferenceById(ownerId), request.type(), request.targetValue(),
                startValueFor(request, ownerId), startDate, request.targetDate());
        return toResponse(goalRepository.save(goal), inputs(ownerId, zone), ownerId);
    }

    @Transactional
    public GoalResponse update(Long id, GoalRequest request, Long ownerId, ZoneId zone) {
        Goal goal = getEntity(id, ownerId);
        LocalDate startDate = request.startDate() != null ? request.startDate() : goal.getStartDate();
        checkRules(request, startDate);
        BigDecimal startValue = request.startValue() != null || goal.getType() != request.type()
                ? startValueFor(request, ownerId)
                : goal.getStartValue();
        goal.setType(request.type());
        goal.setTargetValue(request.targetValue());
        goal.setStartValue(startValue);
        goal.setStartDate(startDate);
        goal.setTargetDate(request.targetDate());
        return toResponse(goal, inputs(ownerId, zone), ownerId);
    }

    @Transactional
    public void delete(Long id, Long ownerId) {
        goalRepository.delete(getEntity(id, ownerId));
    }

    private void checkRules(GoalRequest request, LocalDate startDate) {
        if (request.targetDate() != null && request.targetDate().isBefore(startDate)) {
            throw new BusinessRuleException("targetDate can't be before startDate");
        }
        if (request.type() == GoalType.SESSIONS_PER_WEEK) {
            BigDecimal target = request.targetValue();
            if (target.stripTrailingZeros().scale() > 0 || target.intValue() > MAX_SESSIONS_PER_WEEK) {
                throw new BusinessRuleException("A sessions-per-week goal must be a whole number from 1 to " + MAX_SESSIONS_PER_WEEK);
            }
        } else if (request.targetValue().compareTo(BigDecimal.valueOf(50)) < 0) {
            throw new BusinessRuleException("A target weight must be at least 50 lb");
        }
    }

    private BigDecimal startValueFor(GoalRequest request, Long ownerId) {
        if (request.type() != GoalType.TARGET_WEIGHT) {
            return null;
        }
        if (request.startValue() != null) {
            return request.startValue();
        }
        return weightRepository.findFirstByOwnerIdOrderByMeasuredOnDesc(ownerId)
                .map(BodyWeight::getWeightLb).orElse(null);
    }

    private GoalResponse toResponse(Goal goal, ProgressInputs inputs, Long ownerId) {
        return switch (goal.getType()) {
            case TARGET_WEIGHT -> {
                BigDecimal start = goal.getStartValue() != null ? goal.getStartValue()
                        : weightRepository.findFirstByOwnerIdAndMeasuredOnGreaterThanEqualOrderByMeasuredOnAsc(
                                ownerId, goal.getStartDate()).map(BodyWeight::getWeightLb).orElse(null);
                yield GoalResponse.fromEntity(goal, start,
                        GoalProgressCalculator.weight(start, inputs.currentWeight(), goal.getTargetValue()));
            }
            case SESSIONS_PER_WEEK -> GoalResponse.fromEntity(goal, null,
                    GoalProgressCalculator.sessionsPerWeek(inputs.sessionsThisWeek(), goal.getTargetValue()));
        };
    }

    private ProgressInputs inputs(Long ownerId, ZoneId zone) {
        BigDecimal currentWeight = weightRepository.findFirstByOwnerIdOrderByMeasuredOnDesc(ownerId)
                .map(BodyWeight::getWeightLb).orElse(null);
        long sessionsThisWeek = sessionRepository.countByOwnerIdAndCompletedAtGreaterThanEqual(
                ownerId, WeekCalendar.startOfThisWeek(clock, zone));
        return new ProgressInputs(currentWeight, sessionsThisWeek);
    }

    private record ProgressInputs(BigDecimal currentWeight, long sessionsThisWeek) {}

    private Goal getEntity(Long id, Long ownerId) {
        return goalRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal", id));
    }
}
