package com.hassanhibbert.circuit_trainer.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "workout_exercises")
public class WorkoutExercise {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private WorkoutSection section;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "modifier", length = 200)
    private String modifier;

    @Column(name = "set_label", length = 60)
    private String setLabel;

    @Column(name = "reps", length = 60)
    private String reps;

    @Column(name = "target_reps")
    private Integer targetReps;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "rest_seconds")
    private Integer restSeconds;

    protected WorkoutExercise() {}

    public WorkoutExercise(String title, String modifier, String setLabel, String reps,
                           Integer targetReps, Integer durationSeconds, Integer restSeconds) {
        this.title = title;
        this.modifier = modifier;
        this.setLabel = setLabel;
        this.reps = reps;
        this.targetReps = targetReps;
        this.durationSeconds = durationSeconds;
        this.restSeconds = restSeconds;
    }

    void attachTo(WorkoutSection section, int position) {
        this.section = section;
        this.position = position;
    }

    public Long getId() { return id; }

    public int getPosition() { return position; }

    public String getTitle() { return title; }

    public String getModifier() { return modifier; }

    public String getSetLabel() { return setLabel; }

    public String getReps() { return reps; }

    public Integer getTargetReps() { return targetReps; }

    public Integer getDurationSeconds() { return durationSeconds; }

    public Integer getRestSeconds() { return restSeconds; }
}
