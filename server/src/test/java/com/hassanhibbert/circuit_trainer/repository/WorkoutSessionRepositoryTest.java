package com.hassanhibbert.circuit_trainer.repository;

import com.hassanhibbert.circuit_trainer.UsesDatabase;
import com.hassanhibbert.circuit_trainer.dto.SessionFilter;
import com.hassanhibbert.circuit_trainer.dto.stats.WorkoutStat;
import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.entity.SessionSet;
import com.hassanhibbert.circuit_trainer.entity.Workout;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@UsesDatabase
class WorkoutSessionRepositoryTest {
    @Autowired AppUserRepository users;
    @Autowired WorkoutRepository workouts;
    @Autowired WorkoutSessionRepository sessions;

    private AppUser alice;
    private Workout kettlebell;

    @BeforeEach
    void seed() {
        alice = users.save(new AppUser("alice_sessions", "{noop}x"));
        AppUser bob = users.save(new AppUser("bob_sessions", "{noop}x"));
        kettlebell = workouts.findAllVisibleTo(alice.getId()).stream()
                .filter(w -> w.getTitle().startsWith("Kettlebell Month 1")).findFirst().orElseThrow();

        log(alice, kettlebell, "2026-09-01T10:00:00Z", new SessionSet("Swing", null, 15, new BigDecimal("35.0"), null),
                new SessionSet("Plank", null, null, null, 35));
        log(alice, kettlebell, "2026-09-03T10:00:00Z", new SessionSet("Swing", null, 20, new BigDecimal("35.0"), null));
        log(alice, null, "2026-09-05T10:00:00Z");
        log(bob, kettlebell, "2026-09-04T10:00:00Z", new SessionSet("Swing", null, 100, new BigDecimal("100.0"), null));
    }

    private WorkoutSession log(AppUser owner, Workout workout, String completedAt, SessionSet... sets) {
        WorkoutSession session = new WorkoutSession(owner, workout, workout == null ? "Old Workout" : workout.getTitle(),
                Instant.parse(completedAt), 1200, null);
        session.replaceSets(List.of(sets));
        return sessions.saveAndFlush(session);
    }

    @Test
    void statsByWorkout_groupsOnlyLinkedSessionsOfThisOwner() {
        List<WorkoutStat> stats = sessions.statsByWorkout(alice.getId());

        assertThat(stats).singleElement().satisfies(s -> {
            assertThat(s.workoutId()).isEqualTo(kettlebell.getId());
            assertThat(s.timesCompleted()).isEqualTo(2);
            assertThat(s.firstCompletedAt()).isEqualTo(Instant.parse("2026-09-01T10:00:00Z"));
            assertThat(s.lastCompletedAt()).isEqualTo(Instant.parse("2026-09-03T10:00:00Z"));
            assertThat(s.programWeeks()).isEqualTo(4);
        });
    }

    @Test
    void aggregates_areComputedInTheDatabase() {
        assertThat(sessions.countByOwnerId(alice.getId())).isEqualTo(3);
        assertThat(sessions.sumTotalSeconds(alice.getId())).isEqualTo(3600);
        assertThat(sessions.sumVolumeLb(alice.getId())).isEqualByComparingTo("1225");
    }

    @Test
    void specification_isOwnerScopedWithAHalfOpenDateRange() {
        SessionFilter filter = new SessionFilter(null, Instant.parse("2026-09-03T10:00:00Z"),
                Instant.parse("2026-09-05T10:00:00Z"));

        List<WorkoutSession> found = sessions.findAll(SessionSpecifications.matching(alice.getId(), filter),
                PageRequest.of(0, 10, Sort.by("completedAt"))).getContent();

        assertThat(found).extracting(WorkoutSession::getCompletedAt)
                .containsExactly(Instant.parse("2026-09-03T10:00:00Z"));
    }

    @Test
    void sameWorkoutAtTheSameInstant_isRejectedByTheUniqueConstraint() {
        assertThatThrownBy(() -> log(alice, kettlebell, "2026-09-01T10:00:00Z"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void checkConstraint_rejectsASetWithNoMeasurement() {
        assertThatThrownBy(() -> log(alice, kettlebell, "2026-09-10T10:00:00Z",
                new SessionSet("Nothing", null, null, null, null)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
