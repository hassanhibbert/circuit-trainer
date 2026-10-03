package com.hassanhibbert.circuit_trainer.exception;

/**
 * Well-formed input that breaks a domain rule, e.g. a timed workout with an exercise that has
 * no duration. Every field is valid on its own, so it isn't a 400; it's a 422 Unprocessable Content.
 */
public class BusinessRuleException extends RuntimeException {

    public BusinessRuleException(String message) {
        super(message);
    }
}
