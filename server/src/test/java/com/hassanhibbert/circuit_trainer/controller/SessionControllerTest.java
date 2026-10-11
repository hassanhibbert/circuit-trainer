package com.hassanhibbert.circuit_trainer.controller;

import com.hassanhibbert.circuit_trainer.dto.ImportResult;
import com.hassanhibbert.circuit_trainer.dto.PageResponse;
import com.hassanhibbert.circuit_trainer.dto.SessionFilter;
import com.hassanhibbert.circuit_trainer.security.SecurityConfig;
import com.hassanhibbert.circuit_trainer.service.SessionService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SessionController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
class SessionControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean SessionService sessionService;

    private static RequestPostProcessor user42() {
        return jwt().jwt(token -> token.subject("42"));
    }

    @Test
    void search_bindsFiltersAndDefaultsToNewestFirst() throws Exception {
        when(sessionService.search(eq(42L), any(), any())).thenReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));

        mvc.perform(get("/api/v1/sessions").param("workoutId", "5").param("from", "2026-09-01T00:00:00Z")
                        .with(user42()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));

        ArgumentCaptor<SessionFilter> filter = ArgumentCaptor.forClass(SessionFilter.class);
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(sessionService).search(eq(42L), filter.capture(), pageable.capture());
        assertThat(filter.getValue().workoutId()).isEqualTo(5L);
        assertThat(filter.getValue().from()).isEqualTo(Instant.parse("2026-09-01T00:00:00Z"));
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort().getOrderFor("completedAt").getDirection())
                .isEqualTo(Sort.Direction.DESC);
    }

    @Test
    void create_withAnUnmeasuredSet_is400() throws Exception {
        String body = """
                {"workoutTitle": "Walk", "totalSeconds": 600, "sets": [{"exerciseTitle": "Walk"}]}
                """;

        mvc.perform(post("/api/v1/sessions").with(user42()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors['sets[0].measured']").value("a set needs reps, weightLb or durationSeconds"));
        verifyNoInteractions(sessionService);
    }

    @Test
    void create_withoutAnyWorkoutReference_is400() throws Exception {
        mvc.perform(post("/api/v1/sessions").with(user42()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalSeconds\": 600}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.workoutIdentified").exists());
    }

    @Test
    void import_acceptsTheOldLocalStorageShape() throws Exception {
        when(sessionService.importHistory(any(), eq(42L))).thenReturn(new ImportResult(1, 0));
        String body = """
                {"entries": [{"workoutTitle": "Beginner HIIT Workout - 30 Minutes",
                              "completedAt": "2026-09-01T10:00:00.000Z", "totalSeconds": 1800}]}
                """;

        mvc.perform(post("/api/v1/sessions/import").with(user42()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.added").value(1));
    }
}
