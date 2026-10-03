package com.hassanhibbert.circuit_trainer.auth;

import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.exception.DuplicateResourceException;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import com.hassanhibbert.circuit_trainer.security.TokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock AppUserRepository users;
    @Mock PasswordEncoder passwordEncoder;
    @Mock TokenService tokenService;
    private AuthService service;

    @BeforeEach
    void setUp() {
        when(passwordEncoder.encode("timing-equalizer-password")).thenReturn("dummy-hash");
        service = new AuthService(users, passwordEncoder, tokenService);
    }

    @Test
    void unknownUser_stillPaysForOnePasswordCheck() {
        when(users.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.login(new LoginRequest("ghost", "whatever")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid username or password");
        // The dummy comparison is what makes "no such user" as slow as "wrong password".
        verify(passwordEncoder).matches("whatever", "dummy-hash");
    }

    @Test
    void wrongPassword_getsTheSameMessageAsUnknownUser() {
        when(users.findByUsername("alice")).thenReturn(Optional.of(new AppUser("alice", "real-hash")));
        when(passwordEncoder.matches("nope", "real-hash")).thenReturn(false);

        assertThatThrownBy(() -> service.login(new LoginRequest("alice", "nope")))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Invalid username or password");
    }

    @Test
    void takenUsername_isAConflictAndNothingIsSaved() {
        when(users.existsByUsername("alice")).thenReturn(true);

        assertThatThrownBy(() -> service.register(new RegisterRequest("alice", "correct-horse")))
                .isInstanceOf(DuplicateResourceException.class);
        verify(users, never()).save(org.mockito.ArgumentMatchers.any());
        verify(passwordEncoder, never()).encode(eq("correct-horse"));
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }
}
