package com.hassanhibbert.circuit_trainer.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.hassanhibbert.circuit_trainer.exception.TooManyRequestsException;
import com.hassanhibbert.circuit_trainer.security.AuthProperties;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.TimeMeter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Locale;

// in memory, so limits are per instance. fine for one render instance, would need redis to scale out
@Component
public class AuthRateLimiter {
    private final AuthProperties.RateLimit limits;
    private final TimeMeter timeMeter;
    // bounded and expiring so random usernames or ips can't fill up memory
    private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
            .expireAfterAccess(Duration.ofHours(1))
            .maximumSize(100_000)
            .build();

    @Autowired
    public AuthRateLimiter(AuthProperties properties) {
        this(properties.rateLimit(), TimeMeter.SYSTEM_MILLISECONDS);
    }

    AuthRateLimiter(AuthProperties.RateLimit limits, TimeMeter timeMeter) {
        this.limits = limits;
        this.timeMeter = timeMeter;
    }

    // per ip stops one client trying lots of accounts, per username stops many ips going after one account
    public void checkLogin(String clientIp, String username) {
        consume("login-ip:" + clientIp, limits.loginPerIpPerMinute(), Duration.ofMinutes(1));
        consume(usernameKey(username), limits.loginPerUsernamePer15Minutes(), Duration.ofMinutes(15));
    }

    public void loginSucceeded(String username) {
        buckets.invalidate(usernameKey(username));
    }

    public void checkDemo(String clientIp) {
        consume("demo-ip:" + clientIp, limits.demoPerIpPerHour(), Duration.ofHours(1));
    }

    public void checkRegister(String clientIp) {
        consume("register-ip:" + clientIp, limits.registerPerIpPerHour(), Duration.ofHours(1));
    }

    private void consume(String key, int perPeriod, Duration period) {
        Bucket bucket = buckets.get(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(perPeriod).refillGreedy(perPeriod, period).build())
                .withCustomTimePrecision(timeMeter)
                .build());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            throw new TooManyRequestsException(Duration.ofNanos(probe.getNanosToWaitForRefill()));
        }
    }

    private static String usernameKey(String username) {
        return "login-user:" + username.trim().toLowerCase(Locale.ROOT);
    }
}
