package com.hassanhibbert.circuit_trainer.auth;

import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.entity.RefreshToken;
import com.hassanhibbert.circuit_trainer.repository.RefreshTokenRepository;
import com.hassanhibbert.circuit_trainer.security.AuthProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class RefreshTokenService {
    // two tabs refreshing at the same moment both send the same token, that shouldn't count as theft
    static final Duration REUSE_GRACE = Duration.ofSeconds(30);

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    private final RefreshTokenRepository repository;
    private final AuthProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository, AuthProperties properties, Clock clock) {
        this.repository = repository;
        this.properties = properties;
        this.clock = clock;
    }

    public record Rotation(Long userId, String username, String refreshToken) {
    }

    @Transactional
    public String issue(AppUser user) {
        return issueInFamily(user, UUID.randomUUID());
    }

    // noRollbackFor: revoking a family on reuse has to be saved even though we then throw
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public Rotation rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new InvalidRefreshTokenException();
        }
        RefreshToken token = repository.findByTokenHash(hash(rawToken)).orElseThrow(InvalidRefreshTokenException::new);
        Instant now = clock.instant();
        if (token.isRevoked() || token.isExpired(now)) {
            throw new InvalidRefreshTokenException();
        }
        if (token.isUsed()) {
            if (token.getUsedAt().isBefore(now.minus(REUSE_GRACE))) {
                log.warn("Refresh token reused, revoking family {} of user {}", token.getFamilyId(), token.getOwner().getId());
                repository.revokeFamily(token.getFamilyId(), now);
                throw new InvalidRefreshTokenException();
            }
        } else {
            token.markUsed(now);
        }
        AppUser owner = token.getOwner();
        return new Rotation(owner.getId(), owner.getUsername(), issueInFamily(owner, token.getFamilyId()));
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> repository.revokeFamily(token.getFamilyId(), clock.instant()));
    }

    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void deleteExpired() {
        int deleted = repository.deleteExpiredBefore(clock.instant());
        if (deleted > 0) {
            log.info("Deleted {} expired refresh tokens", deleted);
        }
    }

    private String issueInFamily(AppUser user, UUID familyId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = clock.instant();
        repository.save(new RefreshToken(user, familyId, hash(raw), now, now.plus(properties.refreshTtl())));
        return raw;
    }

    // plain sha-256 is fine here, unlike passwords the tokens are random 256 bit values
    static String hash(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
