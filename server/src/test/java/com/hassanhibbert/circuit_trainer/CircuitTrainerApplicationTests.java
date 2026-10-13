package com.hassanhibbert.circuit_trainer;

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
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@UsesDatabase
class CircuitTrainerApplicationTests {
    @Autowired MockMvc mvc;

    @Test
    void logAWorkoutSeeItInStatsAndKeepUsersApart() throws Exception {
        String alice = register("alice");
        String bob = register("bob");

        String workoutsJson = mvc.perform(get("/api/v1/workouts").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<Integer> ids = JsonPath.read(workoutsJson, "$[?(@.title == 'Kettlebell Month 1 - Foundation')].id");
        long kettlebellId = ids.getFirst();

        String sessionJson = mvc.perform(post("/api/v1/sessions").header("Authorization", "Bearer " + alice)
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"workoutId": %d, "totalSeconds": 1500, "sets": [
                                  {"exerciseTitle": "Two-Hand Swing", "reps": 15, "weightLb": 35},
                                  {"exerciseTitle": "Goblet Squat", "reps": 12, "weightLb": 35}]}
                                """.formatted(kettlebellId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.volumeLb").value(945))
                .andReturn().getResponse().getContentAsString();
        int sessionId = JsonPath.read(sessionJson, "$.id");

        mvc.perform(get("/api/v1/stats").param("tz", "America/New_York").header("Authorization", "Bearer " + alice))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSessions").value(1))
                .andExpect(jsonPath("$.workouts[0].workoutId").value(kettlebellId))
                .andExpect(jsonPath("$.workouts[0].currentWeek").value(1));

        mvc.perform(get("/api/v1/sessions/" + sessionId).header("Authorization", "Bearer " + bob))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/stats").header("Authorization", "Bearer " + bob))
                .andExpect(jsonPath("$.totalSessions").value(0));
    }

    @Test
    void deletingTheAccountNeedsThePasswordAndRemovesEverything() throws Exception {
        String username = "carol_" + UUID.randomUUID().toString().substring(0, 8);
        String token = registerAs(username);
        mvc.perform(post("/api/v1/weights").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"measuredOn\":\"2026-09-01\",\"weightLb\":220.5}"))
                .andExpect(status().isCreated());

        mvc.perform(delete("/api/v1/me").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/me").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"correct-horse\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"correct-horse\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshCookieKeepsYouSignedInUntilYouLogOut() throws Exception {
        MvcResult registered = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"erin_" + UUID.randomUUID().toString().substring(0, 8)
                                + "\",\"password\":\"correct-horse\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        Cookie first = registered.getResponse().getCookie("refresh_token");

        MvcResult refreshed = mvc.perform(post("/api/v1/auth/refresh").cookie(first))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn();
        Cookie second = refreshed.getResponse().getCookie("refresh_token");
        String accessToken = JsonPath.read(refreshed.getResponse().getContentAsString(), "$.accessToken");

        mvc.perform(get("/api/v1/workouts").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        mvc.perform(post("/api/v1/auth/logout").cookie(second)).andExpect(status().isNoContent());

        mvc.perform(post("/api/v1/auth/refresh").cookie(second)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(first)).andExpect(status().isUnauthorized());
    }

    @Test
    void forgedTokenIsRejected() throws Exception {
        String token = register("dave");
        String forged = token.substring(0, token.length() - 4) + "AAAA";

        mvc.perform(get("/api/v1/workouts").header("Authorization", "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    private String register(String prefix) throws Exception {
        return registerAs(prefix + "_" + UUID.randomUUID().toString().substring(0, 8));
    }

    private String registerAs(String username) throws Exception {
        String json = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"correct-horse\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.accessToken");
    }
}
