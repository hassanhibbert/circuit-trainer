package com.hassanhibbert.circuit_trainer.auth;

import com.hassanhibbert.circuit_trainer.exception.TooManyRequestsException;
import com.hassanhibbert.circuit_trainer.security.SecurityConfig;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, RefreshCookies.class})
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean AuthService authService;

    private static final String LOGIN = "{\"username\":\"alice\",\"password\":\"correct-horse\"}";

    private static AuthResult result() {
        return new AuthResult(TokenResponse.bearer("access-123", 900, "alice", false), "refresh-123");
    }

    @Test
    void login_returnsTheAccessTokenAndSetsALockedDownRefreshCookie() throws Exception {
        when(authService.login(any(), anyString())).thenReturn(result());

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-123"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().string("Set-Cookie", allOf(
                        containsString("refresh_token=refresh-123"),
                        containsString("HttpOnly"),
                        containsString("Secure"),
                        containsString("SameSite=Strict"),
                        containsString("Path=/api/v1/auth"))));
    }

    @Test
    void login_passesTheClientIpToTheRateLimit() throws Exception {
        when(authService.login(any(), anyString())).thenReturn(result());

        mvc.perform(post("/api/v1/auth/login").with(r -> { r.setRemoteAddr("203.0.113.9"); return r; })
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                .andExpect(status().isOk());

        verify(authService).login(any(), org.mockito.ArgumentMatchers.eq("203.0.113.9"));
    }

    @Test
    void tooManyAttempts_is429WithRetryAfter() throws Exception {
        when(authService.login(any(), anyString())).thenThrow(new TooManyRequestsException(Duration.ofMillis(41_200)));

        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "42"))
                .andExpect(jsonPath("$.title").value("Too many requests"))
                .andExpect(jsonPath("$.detail").value("Too many attempts. Try again in 42 seconds"));
    }

    @Test
    void refresh_rotatesTheCookie() throws Exception {
        when(authService.refresh("refresh-old")).thenReturn(result());

        mvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("refresh_token", "refresh-old")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-123"))
                .andExpect(header().string("Set-Cookie", containsString("refresh_token=refresh-123")));
    }

    @Test
    void refreshWithABadCookie_is401AndClearsIt() throws Exception {
        when(authService.refresh(any())).thenThrow(new InvalidRefreshTokenException());

        mvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Set-Cookie", allOf(containsString("refresh_token="), containsString("Max-Age=0"))));
    }

    @Test
    void logout_revokesAndClearsTheCookie() throws Exception {
        mvc.perform(post("/api/v1/auth/logout").cookie(new Cookie("refresh_token", "refresh-123")))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));

        verify(authService).logout("refresh-123");
    }
}
