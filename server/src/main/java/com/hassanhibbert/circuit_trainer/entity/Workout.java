package com.hassanhibbert.circuit_trainer.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "workouts")
public class Workout {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // null = built-in workout
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private AppUser owner;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "description", length = 4000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 10)
    private WorkoutMode mode;

    @Column(name = "sessions_per_week")
    private Integer sessionsPerWeek;

    @Column(name = "program_weeks")
    private Integer programWeeks;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "workout", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<WorkoutSection> sections = new ArrayList<>();

    protected Workout() {}

    public Workout(AppUser owner, String title, String description, WorkoutMode mode,
                   Integer sessionsPerWeek, Integer programWeeks) {
        this.owner = owner;
        this.title = title;
        this.description = description;
        this.mode = mode;
        this.sessionsPerWeek = sessionsPerWeek;
        this.programWeeks = programWeeks;
        this.createdAt = Instant.now();
    }

    public void replaceSections(List<WorkoutSection> newSections) {
        sections.clear();
        for (int i = 0; i < newSections.size(); i++) {
            WorkoutSection section = newSections.get(i);
            section.attachTo(this, i);
            sections.add(section);
        }
    }

    public boolean isBuiltIn() { return owner == null; }

    public boolean isOwnedBy(Long userId) { return owner != null && owner.getId().equals(userId); }

    public Long getId() { return id; }

    public AppUser getOwner() { return owner; }

    public String getTitle() { return title; }

    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }

    public void setDescription(String description) { this.description = description; }

    public WorkoutMode getMode() { return mode; }

    public void setMode(WorkoutMode mode) { this.mode = mode; }

    public Integer getSessionsPerWeek() { return sessionsPerWeek; }

    public void setSessionsPerWeek(Integer sessionsPerWeek) { this.sessionsPerWeek = sessionsPerWeek; }

    public Integer getProgramWeeks() { return programWeeks; }

    public void setProgramWeeks(Integer programWeeks) { this.programWeeks = programWeeks; }

    public Instant getCreatedAt() { return createdAt; }

    public List<WorkoutSection> getSections() { return sections; }
}
