package com.hassanhibbert.circuit_trainer.repository;

import com.hassanhibbert.circuit_trainer.UsesDatabase;
import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.entity.Workout;
import com.hassanhibbert.circuit_trainer.entity.WorkoutExercise;
import com.hassanhibbert.circuit_trainer.entity.WorkoutMode;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSection;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSession;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@UsesDatabase
class WorkoutRepositoryTest {
    @Autowired AppUserRepository users;
    @Autowired WorkoutRepository workouts;
    @Autowired WorkoutSessionRepository sessions;
    @Autowired EntityManager entityManager;

    private AppUser alice;
    private AppUser bob;

    @BeforeEach
    void seed() {
        alice = users.save(new AppUser("alice_repo", "{noop}x"));
        bob = users.save(new AppUser("bob_repo", "{noop}x"));
    }

    private Workout custom(AppUser owner, String title) {
        Workout workout = new Workout(owner, title, null, WorkoutMode.MANUAL, null, null);
        workout.replaceSections(List.of(new WorkoutSection(null, List.of(
                new WorkoutExercise("Row", null, null, "10 reps", 10, null, 60)))));
        return workout;
    }

    @Test
    void flywaySeed_providesTheSevenBuiltIns() {
        List<Workout> visible = workouts.findAllVisibleTo(alice.getId());

        assertThat(visible).filteredOn(Workout::isBuiltIn).hasSize(7)
                .extracting(Workout::getTitle).contains("Kettlebell Month 1 - Foundation");
        Workout kettlebell = visible.stream().filter(w -> w.getTitle().startsWith("Kettlebell Month 1")).findFirst().orElseThrow();
        assertThat(kettlebell.getSessionsPerWeek()).isEqualTo(3);
        assertThat(kettlebell.getSections().getFirst().getExercises().getFirst().getTargetReps()).isEqualTo(15);
    }

    @Test
    void visibleWorkouts_areBuiltInsFirstThenOwnNeverSomeoneElses() {
        Workout mine = workouts.save(custom(alice, "Alice's Legs"));
        workouts.save(custom(bob, "Bob's Arms"));

        List<Workout> visible = workouts.findAllVisibleTo(alice.getId());

        assertThat(visible.getLast().getId()).isEqualTo(mine.getId());
        assertThat(visible).extracting(Workout::getTitle).doesNotContain("Bob's Arms");
        assertThat(workouts.findVisibleTo(mine.getId(), bob.getId())).isEmpty();
    }

    @Test
    void titles_areUniquePerOwnerIgnoringCase_butMayRepeatAcrossOwners() {
        workouts.saveAndFlush(custom(alice, "Leg Day"));
        workouts.saveAndFlush(custom(bob, "Leg Day"));

        assertThatThrownBy(() -> workouts.saveAndFlush(custom(alice, "LEG DAY")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingAWorkout_keepsItsHistory() {
        Workout mine = workouts.save(custom(alice, "Temporary"));
        WorkoutSession session = sessions.save(new WorkoutSession(alice, mine, "Temporary",
                Instant.parse("2026-09-01T10:00:00Z"), 900, null));
        entityManager.flush();
        entityManager.clear();

        workouts.delete(workouts.findById(mine.getId()).orElseThrow());
        entityManager.flush();
        entityManager.clear();

        WorkoutSession reloaded = sessions.findById(session.getId()).orElseThrow();
        assertThat(reloaded.getWorkout()).isNull();
        assertThat(reloaded.getWorkoutTitle()).isEqualTo("Temporary");
    }
}
