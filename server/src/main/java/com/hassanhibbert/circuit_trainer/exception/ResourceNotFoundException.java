package com.hassanhibbert.circuit_trainer.exception;

/**
 * Unchecked (extends RuntimeException) so it can bubble up from any service method
 * without every caller declaring "throws". The global handler turns it into a 404.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String resource, Long id) {
        super(resource + " with id " + id + " was not found");
    }
}
