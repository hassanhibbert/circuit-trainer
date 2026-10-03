package com.hassanhibbert.circuit_trainer.exception;

/** A query-string parameter the API can't honour, such as an unknown sort field or time zone. */
public class InvalidQueryException extends RuntimeException {

    public InvalidQueryException(String message) {
        super(message);
    }
}
