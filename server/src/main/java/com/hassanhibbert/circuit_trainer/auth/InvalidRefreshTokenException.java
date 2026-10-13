package com.hassanhibbert.circuit_trainer.auth;

public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException() {
        super("Session expired, please log in again");
    }
}
