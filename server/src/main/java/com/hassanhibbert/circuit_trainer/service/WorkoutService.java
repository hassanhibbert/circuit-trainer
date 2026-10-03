package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.WorkoutRequest;
import com.hassanhibbert.circuit_trainer.dto.WorkoutResponse;
import com.hassanhibbert.circuit_trainer.entity.Workout;
import com.hassanhibbert.circuit_trainer.entity.WorkoutExercise;
import com.hassanhibbert.circuit_trainer.entity.WorkoutMode;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSection;
import com.hassanhibbert.circuit_trainer.exception.BusinessRuleException;
import com.hassanhibbert.circuit_trainer.exception.DuplicateResourceException;
import com.hassanhibbert.circuit_trainer.exception.ReadOnlyResourceException;
import com.hassanhibbert.circuit_trainer.exception.ResourceNotFoundException;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import com.hassanhibbert.circuit_trainer.repository.WorkoutRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class WorkoutService {
    static final int MAX_CUSTOM_WORKOUTS = 100;
    static final int MAX_EXERCISES_PER_WORKOUT = 500;
    private static final int MAX_TITLE_LENGTH = 120;

    private final WorkoutRepository workoutRepository;
    private final AppUserRepository appUserRepository;
    private final HtmlSanitizer htmlSanitizer;

    public WorkoutService(WorkoutRepository workoutRepository, AppUserRepository appUserRepository,
                          HtmlSanitizer htmlSanitizer) {
        this.workoutRepository = workoutRepository;
        this.appUserRepository = appUserRepository;
        this.htmlSanitizer = htmlSanitizer;
    }

    /**
     * Not paginated: a user sees the handful of built-ins plus at most MAX_CUSTOM_WORKOUTS of
     * their own, a small bounded list the app needs in full to draw its home screen.
     * Sections and exercises are lazy; batch fetching loads them in two extra queries in total.
     */
    public List<WorkoutResponse> listVisible(Long ownerId) {
        return workoutRepository.findAllVisibleTo(ownerId).stream().map(WorkoutResponse::fromEntity).toList();
    }

    public WorkoutResponse get(Long id, Long ownerId) {
        return WorkoutResponse.fromEntity(findVisible(id, ownerId));
    }

    @Transactional
    public WorkoutResponse create(WorkoutRequest request, Long ownerId) {
        checkRules(request);
        String title = request.title().trim();
        if (workoutRepository.countByOwnerId(ownerId) >= MAX_CUSTOM_WORKOUTS) {
            throw new BusinessRuleException("You can have at most " + MAX_CUSTOM_WORKOUTS + " custom workouts");
        }
        if (workoutRepository.existsByOwnerIdAndTitleIgnoreCase(ownerId, title)) {
            throw new DuplicateResourceException("You already have a workout called '" + title + "'");
        }
        Workout workout = new Workout(appUserRepository.getReferenceById(ownerId), title,
                htmlSanitizer.sanitize(request.description()), request.mode(),
                request.sessionsPerWeek(), request.programWeeks());
        workout.replaceSections(toSections(request.sections()));
        return WorkoutResponse.fromEntity(workoutRepository.save(workout));
    }

    @Transactional
    public WorkoutResponse update(Long id, WorkoutRequest request, Long ownerId) {
        checkRules(request);
        Workout workout = findEditable(id, ownerId);
        String title = request.title().trim();
        if (workoutRepository.existsByOwnerIdAndTitleIgnoreCaseAndIdNot(ownerId, title, id)) {
            throw new DuplicateResourceException("You already have a workout called '" + title + "'");
        }
        workout.setTitle(title);
        workout.setDescription(htmlSanitizer.sanitize(request.description()));
        workout.setMode(request.mode());
        workout.setSessionsPerWeek(request.sessionsPerWeek());
        workout.setProgramWeeks(request.programWeeks());
        workout.replaceSections(toSections(request.sections()));
        // No save() call: the workout is a managed entity, so Hibernate's dirty checking
        // writes the changes when the transaction commits.
        return WorkoutResponse.fromEntity(workout);
    }

    /** Logged sessions survive: the database sets their workout_id to null (ON DELETE SET NULL). */
    @Transactional
    public void delete(Long id, Long ownerId) {
        workoutRepository.delete(findEditable(id, ownerId));
    }

    /** "Make it mine": copies any visible workout (usually a built-in) into the user's own list. */
    @Transactional
    public WorkoutResponse copy(Long id, Long ownerId) {
        Workout source = findVisible(id, ownerId);
        if (workoutRepository.countByOwnerId(ownerId) >= MAX_CUSTOM_WORKOUTS) {
            throw new BusinessRuleException("You can have at most " + MAX_CUSTOM_WORKOUTS + " custom workouts");
        }
        Workout copy = new Workout(appUserRepository.getReferenceById(ownerId), copyTitle(source.getTitle(), ownerId),
                source.getDescription(), source.getMode(), source.getSessionsPerWeek(), source.getProgramWeeks());
        copy.replaceSections(source.getSections().stream()
                .map(s -> new WorkoutSection(s.getTitle(), s.getExercises().stream()
                        .map(e -> new WorkoutExercise(e.getTitle(), e.getModifier(), e.getSetLabel(), e.getReps(),
                                e.getTargetReps(), e.getDurationSeconds(), e.getRestSeconds()))
                        .toList()))
                .toList());
        return WorkoutResponse.fromEntity(workoutRepository.save(copy));
    }

    /**
     * Rules that span several fields, so they can't be a single field annotation. Checked
     * before touching the database: they depend only on the request.
     */
    void checkRules(WorkoutRequest request) {
        if ((request.sessionsPerWeek() == null) != (request.programWeeks() == null)) {
            throw new BusinessRuleException("sessionsPerWeek and programWeeks must be given together, or not at all");
        }
        int exerciseCount = 0;
        for (WorkoutRequest.Section section : request.sections()) {
            for (WorkoutRequest.Exercise exercise : section.exercises()) {
                exerciseCount++;
                if (request.mode() == WorkoutMode.TIMED && exercise.durationSeconds() == null) {
                    throw new BusinessRuleException("Every exercise in a TIMED workout needs durationSeconds ('"
                            + exercise.title() + "' has none)");
                }
            }
        }
        if (exerciseCount > MAX_EXERCISES_PER_WORKOUT) {
            throw new BusinessRuleException("A workout can have at most " + MAX_EXERCISES_PER_WORKOUT + " exercises");
        }
    }

    private String copyTitle(String original, Long ownerId) {
        for (int n = 1; ; n++) {
            String suffix = n == 1 ? " (copy)" : " (copy " + n + ")";
            String base = original.length() + suffix.length() > MAX_TITLE_LENGTH
                    ? original.substring(0, MAX_TITLE_LENGTH - suffix.length())
                    : original;
            String candidate = base + suffix;
            if (!workoutRepository.existsByOwnerIdAndTitleIgnoreCase(ownerId, candidate)) {
                return candidate;
            }
        }
    }

    private static List<WorkoutSection> toSections(List<WorkoutRequest.Section> sections) {
        return sections.stream()
                .map(s -> new WorkoutSection(
                        s.titleLines() == null || s.titleLines().isEmpty()
                                ? null
                                : String.join("\n", s.titleLines().stream().map(String::trim).toList()),
                        s.exercises().stream()
                                .map(e -> new WorkoutExercise(e.title().trim(), blankToNull(e.modifier()),
                                        blankToNull(e.setLabel()), blankToNull(e.reps()), e.targetReps(),
                                        e.durationSeconds(), e.restSeconds()))
                                .toList()))
                .toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    Workout findVisible(Long id, Long ownerId) {
        return workoutRepository.findVisibleTo(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Workout", id));
    }

    /**
     * Another user's workout is a 404 (findVisible never returns it), so ids can't be probed.
     * A built-in is visible, so pretending it doesn't exist would be confusing: that's a 403.
     */
    private Workout findEditable(Long id, Long ownerId) {
        Workout workout = findVisible(id, ownerId);
        if (workout.isBuiltIn()) {
            throw new ReadOnlyResourceException("Built-in workouts can't be changed. Copy it to make your own version.");
        }
        return workout;
    }
}
