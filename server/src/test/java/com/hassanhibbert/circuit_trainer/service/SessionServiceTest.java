package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.ImportRequest;
import com.hassanhibbert.circuit_trainer.dto.ImportResult;
import com.hassanhibbert.circuit_trainer.dto.SessionFilter;
import com.hassanhibbert.circuit_trainer.dto.SessionRequest;
import com.hassanhibbert.circuit_trainer.dto.SetRequest;
import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.entity.Workout;
import com.hassanhibbert.circuit_trainer.entity.WorkoutMode;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSession;
import com.hassanhibbert.circuit_trainer.exception.BusinessRuleException;
import com.hassanhibbert.circuit_trainer.exception.InvalidQueryException;
import com.hassanhibbert.circuit_trainer.exception.ResourceNotFoundException;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import com.hassanhibbert.circuit_trainer.repository.CompletionKey;
import com.hassanhibbert.circuit_trainer.repository.WorkoutRepository;
import com.hassanhibbert.circuit_trainer.repository.WorkoutSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {
    private static final long USER = 42L;
    private static final Instant NOW = Instant.parse("2026-10-03T12:00:00Z");

    @Mock WorkoutSessionRepository sessionRepository;
    @Mock WorkoutRepository workoutRepository;
    @Mock AppUserRepository appUserRepository;
    private SessionService service;

    @BeforeEach
    void setUp() {
        // A fixed clock makes "now" deterministic: the future-date rule is testable to the second.
        service = new SessionService(sessionRepository, workoutRepository, appUserRepository,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static ImportRequest.Entry entry(String title, String completedAt) {
        return new ImportRequest.Entry(title, Instant.parse(completedAt), 1800, null, null);
    }

    @Test
    void import_skipsRowsAlreadyStoredAndDuplicatesWithinTheFile() {
        when(sessionRepository.findCompletionKeys(USER)).thenReturn(List.of(
                new CompletionKey("Beginner HIIT", Instant.parse("2026-09-01T10:00:00Z"))));
        when(workoutRepository.findAllVisibleTo(USER)).thenReturn(List.of());

        ImportResult result = service.importHistory(new ImportRequest(List.of(
                entry("Beginner HIIT", "2026-09-01T10:00:00Z"),   // already stored
                entry("Beginner HIIT", "2026-09-03T10:00:00Z"),   // new
                entry("Beginner HIIT", "2026-09-03T10:00:00Z"))), // repeated in the file
                USER);

        assertThat(result).isEqualTo(new ImportResult(1, 2));
    }

    @Test
    @SuppressWarnings("unchecked")
    void import_matchesTitlesToTheUsersOwnWorkoutBeforeABuiltIn() {
        Workout builtIn = new Workout(null, "Leg Day", null, WorkoutMode.TIMED, null, null);
        Workout mine = new Workout(new AppUser("me", "x"), "leg day", null, WorkoutMode.TIMED, null, null);
        when(sessionRepository.findCompletionKeys(USER)).thenReturn(List.of());
        when(workoutRepository.findAllVisibleTo(USER)).thenReturn(List.of(builtIn, mine));

        service.importHistory(new ImportRequest(List.of(entry("LEG DAY", "2026-09-01T10:00:00Z"))), USER);

        ArgumentCaptor<List<WorkoutSession>> saved = ArgumentCaptor.forClass(List.class);
        verify(sessionRepository).saveAll(saved.capture());
        assertThat(saved.getValue()).singleElement().satisfies(s -> assertThat(s.getWorkout()).isSameAs(mine));
    }

    @Test
    void create_withAnotherUsersWorkout_isNotFound() {
        when(workoutRepository.findVisibleTo(7L, USER)).thenReturn(Optional.empty());
        SessionRequest request = new SessionRequest(7L, null, null, 600, null, List.of());

        assertThatThrownBy(() -> service.create(request, USER)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void create_rejectsCompletionTimesInTheFuture_beyondClockSkew() {
        SessionRequest skewed = new SessionRequest(null, "Walk", NOW.plusSeconds(60), 600, null, null);
        SessionRequest future = new SessionRequest(null, "Walk", NOW.plusSeconds(3600), 600, null, null);
        when(sessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.create(skewed, USER).completedAt()).isEqualTo(NOW.plusSeconds(60));
        assertThatThrownBy(() -> service.create(future, USER)).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void create_computesVolumeFromRepsAndWeight() {
        when(sessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        SessionRequest request = new SessionRequest(null, "Kettlebell", null, 1500, null, List.of(
                new SetRequest("Swing", null, 15, new BigDecimal("35"), null),
                new SetRequest("Goblet Squat", null, 12, new BigDecimal("35"), null),
                new SetRequest("Plank", null, null, null, 35)));

        assertThat(service.create(request, USER).volumeLb()).isEqualByComparingTo("945");
    }

    @Test
    void search_rejectsSortingByUnlistedFields() {
        assertThatThrownBy(() -> service.search(USER, new SessionFilter(null, null, null),
                PageRequest.of(0, 20, Sort.by("owner.passwordHash"))))
                .isInstanceOf(InvalidQueryException.class);
    }
}
