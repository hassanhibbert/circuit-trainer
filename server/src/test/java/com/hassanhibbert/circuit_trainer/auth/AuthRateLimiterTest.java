package com.hassanhibbert.circuit_trainer.auth;

import com.hassanhibbert.circuit_trainer.exception.TooManyRequestsException;
import com.hassanhibbert.circuit_trainer.security.AuthProperties;
import io.github.bucket4j.TimeMeter;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthRateLimiterTest {

    // a clock the test can move forward
    static class FakeTime implements TimeMeter {
        final AtomicLong nanos = new AtomicLong();

        @Override
        public long currentTimeNanos() {
            return nanos.get();
        }

        @Override
        public boolean isWallClockBased() {
            return false;
        }

        void advance(Duration duration) {
            nanos.addAndGet(duration.toNanos());
        }
    }

    private final FakeTime time = new FakeTime();
    private final AuthRateLimiter limiter = new AuthRateLimiter(new AuthProperties.RateLimit(5, 3, 2), time);

    @Test
    void blocksAnIpAfterTooManyLoginsAndTellsItHowLongToWait() {
        for (int i = 0; i < 5; i++) {
            limiter.checkLogin("1.1.1.1", "user" + i);
        }

        assertThatThrownBy(() -> limiter.checkLogin("1.1.1.1", "someone"))
                .isInstanceOfSatisfying(TooManyRequestsException.class,
                        e -> assertThat(e.getRetryAfterSeconds()).isBetween(1L, 60L));
        assertThatCode(() -> limiter.checkLogin("2.2.2.2", "someone")).doesNotThrowAnyException();
    }

    @Test
    void blocksAUsernameTargetedFromManyIps() {
        limiter.checkLogin("1.1.1.1", "alice");
        limiter.checkLogin("2.2.2.2", "ALICE");
        limiter.checkLogin("3.3.3.3", "alice ");

        assertThatThrownBy(() -> limiter.checkLogin("4.4.4.4", "alice")).isInstanceOf(TooManyRequestsException.class);
    }

    @Test
    void aSuccessfulLoginClearsTheUsernameCount() {
        limiter.checkLogin("1.1.1.1", "alice");
        limiter.checkLogin("1.1.1.1", "alice");
        limiter.loginSucceeded("alice");

        assertThatCode(() -> {
            limiter.checkLogin("2.2.2.2", "alice");
            limiter.checkLogin("2.2.2.2", "alice");
            limiter.checkLogin("2.2.2.2", "alice");
        }).doesNotThrowAnyException();
    }

    @Test
    void attemptsComeBackOverTime() {
        limiter.checkRegister("1.1.1.1");
        limiter.checkRegister("1.1.1.1");
        assertThatThrownBy(() -> limiter.checkRegister("1.1.1.1")).isInstanceOf(TooManyRequestsException.class);

        time.advance(Duration.ofMinutes(31));

        assertThatCode(() -> limiter.checkRegister("1.1.1.1")).doesNotThrowAnyException();
    }
}
