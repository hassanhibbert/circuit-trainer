package com.hassanhibbert.circuit_trainer.controller;

import com.hassanhibbert.circuit_trainer.dto.WorkoutResponse;
import com.hassanhibbert.circuit_trainer.entity.WorkoutMode;
import com.hassanhibbert.circuit_trainer.exception.ReadOnlyResourceException;
import com.hassanhibbert.circuit_trainer.security.SecurityConfig;
import com.hassanhibbert.circuit_trainer.service.WorkoutService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice test: only the web layer (this controller, the exception handler, JSON, validation
 * and our real SecurityConfig) is started. The service is a Mockito mock, so these tests
 * check the HTTP contract: status codes, JSON shape, which user id reaches the service.
 */
@WebMvcTest(WorkoutController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class WorkoutControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean WorkoutService workoutService;

    /** Simulates an already-validated JWT whose subject (user id) is 42. No real token needed. */
    private static RequestPostProcessor user42() {
        return jwt().jwt(token -> token.subject("42"));
    }

    private static WorkoutResponse sample(Long id, boolean builtIn) {
        return new WorkoutResponse(id, "Leg Day", null, WorkoutMode.TIMED, null, null, builtIn,
                List.of(new WorkoutResponse.Section(1L, List.of("Round 1"), List.of(
                        new WorkoutResponse.Exercise(1L, "Squat", null, null, null, null, 30, null)))));
    }

    @Test
    void requestWithoutToken_is401() throws Exception {
        mvc.perform(get("/api/v1/workouts")).andExpect(status().isUnauthorized());
        verifyNoInteractions(workoutService);
    }

    @Test
    void list_passesTheTokensUserId() throws Exception {
        when(workoutService.listVisible(42L)).thenReturn(List.of(sample(1L, true)));

        mvc.perform(get("/api/v1/workouts").with(user42()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].builtIn").value(true))
                .andExpect(jsonPath("$[0].sections[0].titleLines[0]").value("Round 1"));
    }

    @Test
    void nestedValidationErrors_reportTheirFullPath() throws Exception {
        String body = """
                {"title": "", "mode": "TIMED",
                 "sections": [{"exercises": [{"title": "", "durationSeconds": -5}]}]}
                """;

        mvc.perform(post("/api/v1/workouts").with(user42()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists())
                .andExpect(jsonPath("$.errors['sections[0].exercises[0].title']").exists())
                .andExpect(jsonPath("$.errors['sections[0].exercises[0].durationSeconds']").exists());
        verifyNoInteractions(workoutService);
    }

    @Test
    void editingABuiltIn_is403ProblemDetail() throws Exception {
        when(workoutService.update(eq(1L), any(), eq(42L)))
                .thenThrow(new ReadOnlyResourceException("Built-in workouts can't be changed."));
        String body = """
                {"title": "Mine", "mode": "MANUAL", "sections": [{"exercises": [{"title": "Row"}]}]}
                """;

        mvc.perform(put("/api/v1/workouts/1").with(user42()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Read-only resource"));
    }

    @Test
    void copy_returns201WithLocationOfTheNewWorkout() throws Exception {
        when(workoutService.copy(1L, 42L)).thenReturn(sample(9L, false));

        mvc.perform(post("/api/v1/workouts/1/copy").with(user42()))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/v1/workouts/9"));
    }

    @Test
    void corsPreflight_allowsOnlyConfiguredOrigins() throws Exception {
        mvc.perform(options("/api/v1/workouts")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));

        mvc.perform(options("/api/v1/workouts")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }
}
