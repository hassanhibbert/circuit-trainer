package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.entity.BodyWeight;
import com.hassanhibbert.circuit_trainer.entity.Goal;
import com.hassanhibbert.circuit_trainer.entity.GoalType;
import com.hassanhibbert.circuit_trainer.entity.SessionSet;
import com.hassanhibbert.circuit_trainer.entity.Workout;
import com.hassanhibbert.circuit_trainer.entity.WorkoutExercise;
import com.hassanhibbert.circuit_trainer.entity.WorkoutMode;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSection;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSession;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import com.hassanhibbert.circuit_trainer.repository.BodyWeightRepository;
import com.hassanhibbert.circuit_trainer.repository.GoalRepository;
import com.hassanhibbert.circuit_trainer.repository.WorkoutRepository;
import com.hassanhibbert.circuit_trainer.repository.WorkoutSessionRepository;
import com.hassanhibbert.circuit_trainer.security.TokenService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

// the shared read-only demo. stats depend on today's date ("this week", "week 3 of 4"), so the
// data is rebuilt relative to today whenever it gets stale and every night
@Service
public class DemoDataService {
    static final String HIIT = "Beginner HIIT Workout - 30 Minutes";
    static final String UPPER = "Upper Body Strength - 30 Minutes";
    static final String KETTLEBELL = "Kettlebell Month 1 - Foundation";

    private static final Logger log = LoggerFactory.getLogger(DemoDataService.class);
    private static final BigDecimal BELL_LB = new BigDecimal("35");

    private final AppUserRepository userRepository;
    private final WorkoutRepository workoutRepository;
    private final WorkoutSessionRepository sessionRepository;
    private final BodyWeightRepository weightRepository;
    private final GoalRepository goalRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public DemoDataService(AppUserRepository userRepository, WorkoutRepository workoutRepository,
                           WorkoutSessionRepository sessionRepository, BodyWeightRepository weightRepository,
                           GoalRepository goalRepository, PasswordEncoder passwordEncoder, Clock clock) {
        this.userRepository = userRepository;
        this.workoutRepository = workoutRepository;
        this.sessionRepository = sessionRepository;
        this.weightRepository = weightRepository;
        this.goalRepository = goalRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void refreshIfStale() {
        AppUser demo = demoUser();
        LocalDate yesterday = today().minusDays(1);
        boolean fresh = weightRepository.findFirstByOwnerIdOrderByMeasuredOnDesc(demo.getId())
                .map(latest -> !latest.getMeasuredOn().isBefore(yesterday))
                .orElse(false);
        if (!fresh) {
            rebuild(demo);
        }
    }

    @Scheduled(cron = "0 15 4 * * *")
    @Transactional
    public void rebuildNightly() {
        rebuild(demoUser());
    }

    private AppUser demoUser() {
        // the password is random and thrown away, the only way in is POST /auth/demo
        return userRepository.findByUsername(TokenService.DEMO_USERNAME).orElseGet(() -> userRepository.save(
                new AppUser(TokenService.DEMO_USERNAME, passwordEncoder.encode(UUID.randomUUID().toString()))));
    }

    void rebuild(AppUser demo) {
        sessionRepository.deleteAllOwnedBy(demo.getId());
        weightRepository.deleteAllOwnedBy(demo.getId());
        goalRepository.deleteAllOwnedBy(demo.getId());
        workoutRepository.deleteAllOwnedBy(demo.getId());

        Map<String, Workout> builtIns = workoutRepository.findAllVisibleTo(demo.getId()).stream()
                .filter(Workout::isBuiltIn)
                .collect(Collectors.toMap(Workout::getTitle, Function.identity()));
        Random random = new Random(42);
        LocalDate today = today();
        LocalDate thisMonday = WeekCalendar.weekStart(today);
        LocalDate programStart = thisMonday.minusWeeks(2);

        List<WorkoutSession> sessions = new ArrayList<>();
        for (LocalDate day = thisMonday.minusWeeks(10); day.isBefore(programStart); day = day.plusDays(1)) {
            DayOfWeek weekday = day.getDayOfWeek();
            if (weekday == DayOfWeek.MONDAY || weekday == DayOfWeek.FRIDAY) {
                sessions.add(session(demo, builtIns.get(HIIT), day, 31 + random.nextInt(4), random, false));
            } else if (weekday == DayOfWeek.WEDNESDAY) {
                sessions.add(session(demo, builtIns.get(UPPER), day, 30 + random.nextInt(5), random, false));
            }
        }
        // started two mondays ago, so the list shows "week 3 of 4"
        for (LocalDate day = programStart; day.isBefore(today); day = day.plusDays(1)) {
            DayOfWeek weekday = day.getDayOfWeek();
            if (weekday == DayOfWeek.MONDAY || weekday == DayOfWeek.WEDNESDAY || weekday == DayOfWeek.FRIDAY) {
                sessions.add(session(demo, builtIns.get(KETTLEBELL), day, 27 + random.nextInt(8), random, true));
            }
        }
        if (!sessions.isEmpty()) {
            sessions.getLast().setNotes("Swings felt strong, try 2 more reps next time");
        }
        sessionRepository.saveAll(sessions);

        LocalDate firstWeighIn = today.minusDays(1).minusWeeks(10);
        BigDecimal weight = new BigDecimal("238.4");
        for (int week = 0; week <= 10; week++) {
            weightRepository.save(new BodyWeight(demo, firstWeighIn.plusWeeks(week), weight, null));
            weight = weight.subtract(BigDecimal.valueOf(0.6 + random.nextDouble())).setScale(1, RoundingMode.HALF_UP);
        }

        goalRepository.save(new Goal(demo, GoalType.TARGET_WEIGHT, new BigDecimal("200"), new BigDecimal("238.4"),
                firstWeighIn, today.plusMonths(5)));
        goalRepository.save(new Goal(demo, GoalType.SESSIONS_PER_WEEK, new BigDecimal("3"), null,
                thisMonday.minusWeeks(10), null));

        workoutRepository.save(finisher(demo));
        log.info("Rebuilt demo data: {} sessions", sessions.size());
    }

    private WorkoutSession session(AppUser demo, Workout workout, LocalDate day, int minutes, Random random,
                                   boolean logSets) {
        WorkoutSession session = new WorkoutSession(demo, workout, workout.getTitle(),
                day.atTime(12, random.nextInt(50)).toInstant(ZoneOffset.UTC), minutes * 60 + random.nextInt(60), null);
        if (logSets) {
            session.replaceSets(workout.getSections().stream()
                    .flatMap(section -> section.getExercises().stream())
                    .map(exercise -> set(exercise, random))
                    .toList());
        }
        return session;
    }

    private static SessionSet set(WorkoutExercise exercise, Random random) {
        if (exercise.getTargetReps() == null && exercise.getDurationSeconds() != null) {
            return new SessionSet(exercise.getTitle(), exercise.getSetLabel(), null, null, exercise.getDurationSeconds());
        }
        boolean bodyweight = exercise.getTitle().contains("Push-Up");
        int reps = exercise.getTargetReps() != null ? exercise.getTargetReps() : 10 + random.nextInt(4);
        return new SessionSet(exercise.getTitle(), exercise.getSetLabel(), reps, bodyweight ? null : BELL_LB, null);
    }

    private static Workout finisher(AppUser demo) {
        Workout workout = new Workout(demo, "Kettlebell Finisher", "<p>A short add-on for days with energy left.</p>",
                WorkoutMode.MANUAL, null, null);
        workout.replaceSections(List.of(new WorkoutSection(null, List.of(
                new WorkoutExercise("Two-Hand Swing", null, "Set 1 of 3", "20 reps", 20, null, 45),
                new WorkoutExercise("Two-Hand Swing", null, "Set 2 of 3", "20 reps", 20, null, 45),
                new WorkoutExercise("Two-Hand Swing", null, "Set 3 of 3", "20 reps", 20, null, 45),
                new WorkoutExercise("Goblet Squat", null, "Set 1 of 2", "12 reps", 12, null, 60),
                new WorkoutExercise("Goblet Squat", null, "Set 2 of 2", "12 reps", 12, null, 60),
                new WorkoutExercise("Plank", null, null, "40s hold", null, 40, null)))));
        return workout;
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(ZoneOffset.UTC));
    }
}
