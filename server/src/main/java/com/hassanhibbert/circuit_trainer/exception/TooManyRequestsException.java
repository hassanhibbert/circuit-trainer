package com.hassanhibbert.circuit_trainer.exception;

import java.time.Duration;

public class TooManyRequestsException extends RuntimeException {
    private final long retryAfterSeconds;

    public TooManyRequestsException(Duration retryAfter) {
        this(Math.max(1, (long) Math.ceil(retryAfter.toMillis() / 1000.0)));
    }

    private TooManyRequestsException(long retryAfterSeconds) {
        super("Too many attempts. Try again in " + retryAfterSeconds + " seconds");
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
