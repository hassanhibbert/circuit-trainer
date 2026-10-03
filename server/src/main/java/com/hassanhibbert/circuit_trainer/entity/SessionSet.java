package com.hassanhibbert.circuit_trainer.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;

/** One set as actually performed: what, how many, how heavy, how long. */
@Entity
@Table(name = "session_sets")
public class SessionSet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private WorkoutSession session;

    @Column(name = "position", nullable = false)
    private int position;

    // A copy of the exercise name, not a foreign key: the log must stay readable after the
    // workout it came from is edited or deleted.
    @Column(name = "exercise_title", nullable = false, length = 120)
    private String exerciseTitle;

    @Column(name = "set_label", length = 60)
    private String setLabel;

    @Column(name = "reps")
    private Integer reps;

    // BigDecimal, not double: maps exactly onto NUMERIC(5,1), and sums don't drift.
    @Column(name = "weight_lb", precision = 5, scale = 1)
    private BigDecimal weightLb;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    protected SessionSet() {}

    public SessionSet(String exerciseTitle, String setLabel, Integer reps, BigDecimal weightLb,
                      Integer durationSeconds) {
        this.exerciseTitle = exerciseTitle;
        this.setLabel = setLabel;
        this.reps = reps;
        this.weightLb = weightLb;
        this.durationSeconds = durationSeconds;
    }

    void attachTo(WorkoutSession session, int position) {
        this.session = session;
        this.position = position;
    }

    public Long getId() { return id; }

    public int getPosition() { return position; }

    public String getExerciseTitle() { return exerciseTitle; }

    public String getSetLabel() { return setLabel; }

    public Integer getReps() { return reps; }

    public BigDecimal getWeightLb() { return weightLb; }

    public Integer getDurationSeconds() { return durationSeconds; }
}
