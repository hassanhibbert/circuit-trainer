package com.hassanhibbert.circuit_trainer.entity;

/** How the frontend runs a workout. */
public enum WorkoutMode {
    /** Auto-advancing countdowns: every exercise needs a duration. */
    TIMED,
    /** Self-paced: the user taps through sets, with an optional rest target between them. */
    MANUAL
}
