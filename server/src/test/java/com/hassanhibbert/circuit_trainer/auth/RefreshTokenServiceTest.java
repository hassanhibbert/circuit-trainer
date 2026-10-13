package com.hassanhibbert.circuit_trainer.auth;

import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.entity.RefreshToken;
import com.hassanhibbert.circuit_trainer.repository.RefreshTokenRepository;
import com.hassanhibbert.circuit_trainer.security.AuthProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {
    private static final Instant NOW = Instant.parse("2026-10-13T12:00:00Z");
    private static final AuthProperties PROPS =
            new AuthProperties(Duration.ofDays(30), true, new AuthProperties.RateLimit(20, 10, 5));

    @Mock RefreshTokenRepository repository;
    private RefreshTokenService service;
    private final AppUser alice = new AppUser("alice", "x");

    @BeforeEach
    void setUp() {
        service = new RefreshTokenService(repository, PROPS, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private RefreshToken stored(String raw, UUID family, Instant expiresAt) {
        RefreshToken token = new RefreshToken(alice, family, RefreshTokenService.hash(raw), NOW.minusSeconds(60), expiresAt);
        when(repository.findByTokenHash(RefreshTokenService.hash(raw))).thenReturn(Optional.of(token));
        return token;
    }

    @Test
    void issue_storesOnlyTheHashWithA30DayExpiry() {
        String raw = service.issue(alice);

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getTokenHash()).isEqualTo(RefreshTokenService.hash(raw)).isNotEqualTo(raw);
        assertThat(saved.getValue().getExpiresAt()).isEqualTo(NOW.plus(Duration.ofDays(30)));
        assertThat(raw).hasSizeGreaterThanOrEqualTo(43);
    }

    @Test
    void rotate_retiresTheOldTokenAndIssuesANewOneInTheSameFamily() {
        UUID family = UUID.randomUUID();
        RefreshToken old = stored("old-token", family, NOW.plus(Duration.ofDays(1)));

        RefreshTokenService.Rotation rotation = service.rotate("old-token");

        assertThat(old.getUsedAt()).isEqualTo(NOW);
        assertThat(rotation.username()).isEqualTo("alice");
        assertThat(rotation.refreshToken()).isNotEqualTo("old-token");
        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().getFamilyId()).isEqualTo(family);
    }

    @Test
    void reusingARetiredToken_revokesTheWholeFamily() {
        UUID family = UUID.randomUUID();
        RefreshToken old = stored("stolen", family, NOW.plus(Duration.ofDays(1)));
        old.markUsed(NOW.minus(Duration.ofMinutes(5)));

        assertThatThrownBy(() -> service.rotate("stolen")).isInstanceOf(InvalidRefreshTokenException.class);
        verify(repository).revokeFamily(family, NOW);
        verify(repository, never()).save(any());
    }

    @Test
    void twoTabsRefreshingAtOnce_isNotTreatedAsTheft() {
        UUID family = UUID.randomUUID();
        RefreshToken old = stored("shared", family, NOW.plus(Duration.ofDays(1)));
        old.markUsed(NOW.minusSeconds(5));

        RefreshTokenService.Rotation rotation = service.rotate("shared");

        assertThat(rotation.refreshToken()).isNotBlank();
        verify(repository, never()).revokeFamily(any(), any());
    }

    @Test
    void expiredRevokedMissingAndUnknownTokens_areRejected() {
        stored("expired", UUID.randomUUID(), NOW);
        when(repository.findByTokenHash(RefreshTokenService.hash("unknown"))).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("expired")).isInstanceOf(InvalidRefreshTokenException.class);
        assertThatThrownBy(() -> service.rotate("unknown")).isInstanceOf(InvalidRefreshTokenException.class);
        assertThatThrownBy(() -> service.rotate(null)).isInstanceOf(InvalidRefreshTokenException.class);
        assertThatThrownBy(() -> service.rotate(" ")).isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void revoke_endsTheWholeLogin() {
        UUID family = UUID.randomUUID();
        stored("current", family, NOW.plus(Duration.ofDays(1)));

        service.revoke("current");

        verify(repository).revokeFamily(family, NOW);
    }
}
