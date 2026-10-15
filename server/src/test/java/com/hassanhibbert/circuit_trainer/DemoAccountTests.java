package com.hassanhibbert.circuit_trainer;

import com.hassanhibbert.circuit_trainer.service.DemoDataService;
import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@UsesDatabase
class DemoAccountTests {

    @Autowired MockMvc mvc;
    @Autowired DemoDataService demoDataService;

    private MvcResult startDemo() throws Exception {
        return mvc.perform(post("/api/v1/auth/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("Demo Trainer"))
                .andExpect(jsonPath("$.readOnly").value(true))
                .andReturn();
    }

    private static String token(MvcResult result) throws Exception {
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void theDemoHasCurrentLookingDataToBrowse() throws Exception {
        String token = token(startDemo());

        String stats = mvc.perform(get("/api/v1/stats").param("tz", "America/New_York")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.goals.length()").value(2))
                .andExpect(jsonPath("$.weight.entries").value(11))
                .andReturn().getResponse().getContentAsString();

        assertThat((Integer) JsonPath.read(stats, "$.totalSessions")).isGreaterThan(20);
        List<Integer> weeks = JsonPath.read(stats, "$.workouts[?(@.title == 'Kettlebell Month 1 - Foundation')].currentWeek");
        assertThat(weeks).containsExactly(3);
        mvc.perform(get("/api/v1/workouts").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[?(@.title == 'Kettlebell Finisher')].builtIn").value(false));
    }

    @Test
    void theDemoCanLookButNeverChangeAnything() throws Exception {
        String token = token(startDemo());

        mvc.perform(post("/api/v1/sessions").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"workoutTitle\":\"Walk\",\"totalSeconds\":600}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title").value("Read-only demo"));
        mvc.perform(post("/api/v1/workouts/1/copy").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/v1/me").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"anything\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void aRefreshedDemoTokenIsStillReadOnly() throws Exception {
        Cookie cookie = startDemo().getResponse().getCookie("refresh_token");

        MvcResult refreshed = mvc.perform(post("/api/v1/auth/refresh").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readOnly").value(true))
                .andReturn();

        mvc.perform(post("/api/v1/weights").header("Authorization", "Bearer " + token(refreshed))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"measuredOn\":\"2026-01-01\",\"weightLb\":200}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void nobodyCanRegisterTheDemoName() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"Demo Trainer\",\"password\":\"correct-horse\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rebuildingReplacesTheDataInsteadOfAddingToIt() throws Exception {
        String token = token(startDemo());
        String before = mvc.perform(get("/api/v1/stats").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();

        demoDataService.rebuildNightly();
        demoDataService.rebuildNightly();

        String after = mvc.perform(get("/api/v1/stats").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(after, "$.totalSessions"))
                .isEqualTo((Integer) JsonPath.read(before, "$.totalSessions"));
        assertThat((Integer) JsonPath.read(after, "$.weight.entries")).isEqualTo(11);
    }
}
