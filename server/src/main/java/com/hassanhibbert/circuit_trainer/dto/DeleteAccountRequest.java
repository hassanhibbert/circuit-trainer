package com.hassanhibbert.circuit_trainer.dto;

import jakarta.validation.constraints.NotBlank;

/** Deleting an account asks for the password again: a stolen token alone isn't enough. */
public record DeleteAccountRequest(@NotBlank String password) {
}
