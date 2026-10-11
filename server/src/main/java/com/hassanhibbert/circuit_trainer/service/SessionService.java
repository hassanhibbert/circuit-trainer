package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.ImportRequest;
import com.hassanhibbert.circuit_trainer.dto.ImportResult;
import com.hassanhibbert.circuit_trainer.dto.PageResponse;
import com.hassanhibbert.circuit_trainer.dto.SessionFilter;
import com.hassanhibbert.circuit_trainer.dto.SessionRequest;
import com.hassanhibbert.circuit_trainer.dto.SessionResponse;
import com.hassanhibbert.circuit_trainer.dto.SetRequest;
import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.entity.SessionSet;
import com.hassanhibbert.circuit_trainer.entity.Workout;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSession;
import com.hassanhibbert.circuit_trainer.exception.BusinessRuleException;
import com.hassanhibbert.circuit_trainer.exception.DuplicateResourceException;
import com.hassanhibbert.circuit_trainer.exception.InvalidQueryException;
import com.hassanhibbert.circuit_trainer.exception.ResourceNotFoundException;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import com.hassanhibbert.circuit_trainer.repository.CompletionKey;
import com.hassanhibbert.circuit_trainer.repository.SessionSpecifications;
import com.hassanhibbert.circuit_trainer.repository.WorkoutRepository;
import com.hassanhibbert.circuit_trainer.repository.WorkoutSessionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class SessionService {
    static final Duration CLOCK_SKEW_ALLOWANCE = Duration.ofMinutes(5);

    static final Set<String> SORTABLE = Set.of("completedAt", "totalSeconds");

    private final WorkoutSessionRepository sessionRepository;
    private final WorkoutRepository workoutRepository;
    private final AppUserRepository appUserRepository;
    private final Clock clock;

    public SessionService(WorkoutSessionRepository sessionRepository, WorkoutRepository workoutRepository,
                          AppUserRepository appUserRepository, Clock clock) {
        this.sessionRepository = sessionRepository;
        this.workoutRepository = workoutRepository;
        this.appUserRepository = appUserRepository;
        this.clock = clock;
    }

    public PageResponse<SessionResponse> search(Long ownerId, SessionFilter filter, Pageable pageable) {
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE.contains(order.getProperty())) {
                throw new InvalidQueryException("Cannot sort by '" + order.getProperty() + "'. Allowed: " + SORTABLE);
            }
        }
        Pageable stable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id")));

        // no fetch join on sets here, it would make hibernate page in memory. batch fetching loads them instead
        Page<WorkoutSession> page = sessionRepository.findAll(SessionSpecifications.matching(ownerId, filter), stable);
        return PageResponse.from(page, SessionResponse::fromEntity);
    }

    public SessionResponse get(Long id, Long ownerId) {
        return SessionResponse.fromEntity(getEntity(id, ownerId));
    }

    public List<SessionResponse> exportAll(Long ownerId) {
        return sessionRepository.findByOwnerIdOrderByCompletedAtAsc(ownerId).stream()
                .map(SessionResponse::fromEntity).toList();
    }

    @Transactional
    public SessionResponse create(SessionRequest request, Long ownerId) {
        Workout workout = request.workoutId() == null ? null : findVisibleWorkout(request.workoutId(), ownerId);
        String title = workout != null ? workout.getTitle() : request.workoutTitle().trim();
        Instant completedAt = resolveCompletedAt(request.completedAt());
        if (sessionRepository.existsByOwnerIdAndWorkoutTitleAndCompletedAt(ownerId, title, completedAt)) {
            throw new DuplicateResourceException("A session of '" + title + "' completed at " + completedAt + " already exists");
        }

        WorkoutSession session = new WorkoutSession(appUserRepository.getReferenceById(ownerId), workout, title,
                completedAt, request.totalSeconds(), blankToNull(request.notes()));
        session.replaceSets(toSets(request.sets()));
        return SessionResponse.fromEntity(sessionRepository.save(session));
    }

    @Transactional
    public SessionResponse update(Long id, SessionRequest request, Long ownerId) {
        WorkoutSession session = getEntity(id, ownerId);
        Workout workout = request.workoutId() == null ? null : findVisibleWorkout(request.workoutId(), ownerId);
        session.setWorkout(workout);
        session.setWorkoutTitle(workout != null ? workout.getTitle() : request.workoutTitle().trim());
        if (request.completedAt() != null) {
            session.setCompletedAt(resolveCompletedAt(request.completedAt()));
        }
        session.setTotalSeconds(request.totalSeconds());
        session.setNotes(blankToNull(request.notes()));
        session.replaceSets(toSets(request.sets()));
        return SessionResponse.fromEntity(session);
    }

    @Transactional
    public void delete(Long id, Long ownerId) {
        sessionRepository.delete(getEntity(id, ownerId));
    }

    @Transactional
    public ImportResult importHistory(ImportRequest request, Long ownerId) {
        Set<CompletionKey> seen = new HashSet<>(sessionRepository.findCompletionKeys(ownerId));
        Map<String, Workout> workoutsByTitle = visibleWorkoutsByTitle(ownerId);
        AppUser owner = appUserRepository.getReferenceById(ownerId);

        List<WorkoutSession> toSave = new ArrayList<>();
        for (ImportRequest.Entry entry : request.entries()) {
            String title = entry.workoutTitle().trim();
            if (!seen.add(new CompletionKey(title, entry.completedAt()))) {
                continue;
            }
            Workout workout = workoutsByTitle.get(title.toLowerCase(Locale.ROOT));
            WorkoutSession session = new WorkoutSession(owner, workout, title, entry.completedAt(),
                    entry.totalSeconds(), blankToNull(entry.notes()));
            session.replaceSets(toSets(entry.sets()));
            toSave.add(session);
        }
        sessionRepository.saveAll(toSave);
        return new ImportResult(toSave.size(), request.entries().size() - toSave.size());
    }

    private Map<String, Workout> visibleWorkoutsByTitle(Long ownerId) {
        Map<String, Workout> byTitle = new HashMap<>();
        for (Workout w : workoutRepository.findAllVisibleTo(ownerId)) {
            String key = w.getTitle().toLowerCase(Locale.ROOT);
            if (!w.isBuiltIn() || !byTitle.containsKey(key)) {
                byTitle.put(key, w);
            }
        }
        return byTitle;
    }

    private Instant resolveCompletedAt(Instant requested) {
        Instant now = clock.instant();
        if (requested == null) {
            return now;
        }
        if (requested.isAfter(now.plus(CLOCK_SKEW_ALLOWANCE))) {
            throw new BusinessRuleException("completedAt can't be in the future");
        }
        return requested;
    }

    private static List<SessionSet> toSets(List<SetRequest> sets) {
        if (sets == null) {
            return List.of();
        }
        return sets.stream()
                .map(s -> new SessionSet(s.exerciseTitle().trim(), blankToNull(s.setLabel()), s.reps(),
                        s.weightLb(), s.durationSeconds()))
                .toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private WorkoutSession getEntity(Long id, Long ownerId) {
        return sessionRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Session", id));
    }

    private Workout findVisibleWorkout(Long id, Long ownerId) {
        return workoutRepository.findVisibleTo(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout", id));
    }
}
