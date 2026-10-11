package com.hassanhibbert.circuit_trainer.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workout_sessions")
public class WorkoutSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private AppUser owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_id")
    private Workout workout;

    // copied so history still makes sense after the workout is renamed or deleted
    @Column(name = "workout_title", nullable = false, length = 120)
    private String workoutTitle;

    @Column(name = "completed_at", nullable = false)
    private Instant completedAt;

    @Column(name = "total_seconds", nullable = false)
    private Integer totalSeconds;

    @Column(name = "notes", length = 2000)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<SessionSet> sets = new ArrayList<>();

    protected WorkoutSession() {}

    public WorkoutSession(AppUser owner, Workout workout, String workoutTitle, Instant completedAt,
                          Integer totalSeconds, String notes) {
        this.owner = owner;
        this.workout = workout;
        this.workoutTitle = workoutTitle;
        this.completedAt = completedAt;
        this.totalSeconds = totalSeconds;
        this.notes = notes;
        this.createdAt = Instant.now();
    }

    public void replaceSets(List<SessionSet> newSets) {
        sets.clear();
        for (int i = 0; i < newSets.size(); i++) {
            SessionSet set = newSets.get(i);
            set.attachTo(this, i);
            sets.add(set);
        }
    }

    public BigDecimal volumeLb() {
        return sets.stream()
                .filter(s -> s.getReps() != null && s.getWeightLb() != null)
                .map(s -> s.getWeightLb().multiply(BigDecimal.valueOf(s.getReps())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public Long getId() { return id; }

    public AppUser getOwner() { return owner; }

    public Workout getWorkout() { return workout; }

    public void setWorkout(Workout workout) { this.workout = workout; }

    public String getWorkoutTitle() { return workoutTitle; }

    public void setWorkoutTitle(String workoutTitle) { this.workoutTitle = workoutTitle; }

    public Instant getCompletedAt() { return completedAt; }

    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public Integer getTotalSeconds() { return totalSeconds; }

    public void setTotalSeconds(Integer totalSeconds) { this.totalSeconds = totalSeconds; }

    public String getNotes() { return notes; }

    public void setNotes(String notes) { this.notes = notes; }

    public Instant getCreatedAt() { return createdAt; }

    public List<SessionSet> getSets() { return sets; }
}
