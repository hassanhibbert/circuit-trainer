package com.hassanhibbert.circuit_trainer.exception;

public class ReadOnlyResourceException extends RuntimeException {
    public ReadOnlyResourceException(String message) {
        super(message);
    }
}
