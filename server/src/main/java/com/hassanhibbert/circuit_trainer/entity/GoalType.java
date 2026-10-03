package com.hassanhibbert.circuit_trainer.entity;

public enum GoalType {
    /** Reach a body weight (lb). Works for losing and for gaining: the direction comes from the start value. */
    TARGET_WEIGHT,
    /** Complete at least this many workouts every calendar week. */
    SESSIONS_PER_WEEK
}
