package com.hassanhibbert.circuit_trainer.exception;

/**
 * The caller may see this resource but not change it (a built-in workout). Becomes a 403.
 * Contrast with another user's workout, which is a 404: that one must not even be confirmed to exist.
 */
public class ReadOnlyResourceException extends RuntimeException {

    public ReadOnlyResourceException(String message) {
        super(message);
    }
}
