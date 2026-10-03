package com.hassanhibbert.circuit_trainer.exception;

/** The request would create a second copy of something that must be unique. Becomes a 409. */
public class DuplicateResourceException extends RuntimeException {

    public DuplicateResourceException(String message) {
        super(message);
    }
}
