package com.hassanhibbert.circuit_trainer.entity;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout_sections")
public class WorkoutSection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workout_id", nullable = false)
    private Workout workout;

    @Column(name = "position", nullable = false)
    private int position;

    // Display lines joined with '\n' (e.g. "Round 1\nLower Body"). Null for manual workouts.
    @Column(name = "title", length = 200)
    private String title;

    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<WorkoutExercise> exercises = new ArrayList<>();

    protected WorkoutSection() {}

    public WorkoutSection(String title, List<WorkoutExercise> exercises) {
        this.title = title;
        for (int i = 0; i < exercises.size(); i++) {
            WorkoutExercise exercise = exercises.get(i);
            exercise.attachTo(this, i);
            this.exercises.add(exercise);
        }
    }

    // Package-private: only Workout.replaceSections should wire a section to its parent.
    void attachTo(Workout workout, int position) {
        this.workout = workout;
        this.position = position;
    }

    public Long getId() { return id; }

    public Workout getWorkout() { return workout; }

    public int getPosition() { return position; }

    public String getTitle() { return title; }

    public List<WorkoutExercise> getExercises() { return exercises; }
}
