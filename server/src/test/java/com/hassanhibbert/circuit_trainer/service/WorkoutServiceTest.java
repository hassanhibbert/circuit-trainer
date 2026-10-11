package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.WorkoutRequest;
import com.hassanhibbert.circuit_trainer.dto.WorkoutResponse;
import com.hassanhibbert.circuit_trainer.entity.AppUser;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkoutServiceTest {
    private static final long USER = 42L;

    @Mock WorkoutRepository workoutRepository;
    @Mock AppUserRepository appUserRepository;
    private WorkoutService service;

    @BeforeEach
    void setUp() {
        service = new WorkoutService(workoutRepository, appUserRepository, new HtmlSanitizer());
    }

    private static Workout builtIn() {
        Workout workout = new Workout(null, "Kettlebell Month 1", "<p>35lb bell</p>", WorkoutMode.MANUAL, 3, 4);
        workout.replaceSections(List.of(new WorkoutSection(null, List.of(
                new WorkoutExercise("Two-Hand Swing", null, "Set 1 of 5", "15 reps", 15, null, 60)))));
        return workout;
    }

    private static WorkoutRequest timedRequest(Integer durationSeconds) {
        return new WorkoutRequest("Leg Day", "<p onclick=\"x()\">Legs</p>", WorkoutMode.TIMED, null, null,
                List.of(new WorkoutRequest.Section(List.of("Round 1"), List.of(
                        new WorkoutRequest.Exercise("Squat", null, null, null, null, durationSeconds, null)))));
    }

    @Test
    void create_sanitizesDescriptionAndSaves() {
        when(workoutRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WorkoutResponse created = service.create(timedRequest(30), USER);

        assertThat(created.description()).isEqualTo("<p>Legs</p>");
        assertThat(created.sections()).singleElement()
                .satisfies(s -> assertThat(s.titleLines()).containsExactly("Round 1"));
    }

    @Test
    void timedWorkout_withoutDurations_breaksARule() {
        assertThatThrownBy(() -> service.create(timedRequest(null), USER))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Squat");
        verify(workoutRepository, never()).save(any());
    }

    @Test
    void programFields_mustComeTogether() {
        WorkoutRequest request = new WorkoutRequest("Plan", null, WorkoutMode.MANUAL, 3, null,
                List.of(new WorkoutRequest.Section(null, List.of(
                        new WorkoutRequest.Exercise("Row", null, null, null, null, null, null)))));

        assertThatThrownBy(() -> service.create(request, USER)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void duplicateTitle_isAConflict() {
        when(workoutRepository.existsByOwnerIdAndTitleIgnoreCase(USER, "Leg Day")).thenReturn(true);

        assertThatThrownBy(() -> service.create(timedRequest(30), USER))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void builtInWorkouts_areReadOnly() {
        when(workoutRepository.findVisibleTo(1L, USER)).thenReturn(Optional.of(builtIn()));

        assertThatThrownBy(() -> service.update(1L, timedRequest(30), USER))
                .isInstanceOf(ReadOnlyResourceException.class);
        assertThatThrownBy(() -> service.delete(1L, USER))
                .isInstanceOf(ReadOnlyResourceException.class);
    }

    @Test
    void someoneElsesWorkout_isNotFound() {
        when(workoutRepository.findVisibleTo(99L, USER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(99L, USER)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void copy_picksTheNextFreeTitleAndDeepCopiesExercises() {
        when(workoutRepository.findVisibleTo(1L, USER)).thenReturn(Optional.of(builtIn()));
        when(workoutRepository.existsByOwnerIdAndTitleIgnoreCase(eq(USER), anyString())).thenReturn(false);
        when(workoutRepository.existsByOwnerIdAndTitleIgnoreCase(USER, "Kettlebell Month 1 (copy)")).thenReturn(true);
        when(workoutRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(appUserRepository.getReferenceById(USER)).thenReturn(new AppUser("me", "x"));

        WorkoutResponse copy = service.copy(1L, USER);

        assertThat(copy.title()).isEqualTo("Kettlebell Month 1 (copy 2)");
        assertThat(copy.builtIn()).isFalse();
        assertThat(copy.programWeeks()).isEqualTo(4);
        ArgumentCaptor<Workout> saved = ArgumentCaptor.forClass(Workout.class);
        verify(workoutRepository).save(saved.capture());
        assertThat(saved.getValue().getSections().getFirst().getExercises().getFirst().getTargetReps()).isEqualTo(15);
    }

    @Test
    void customWorkoutLimit_isEnforced() {
        when(workoutRepository.countByOwnerId(USER)).thenReturn((long) WorkoutService.MAX_CUSTOM_WORKOUTS);

        assertThatThrownBy(() -> service.create(timedRequest(30), USER)).isInstanceOf(BusinessRuleException.class);
    }
}
