package com.hassanhibbert.circuit_trainer.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "goals")
public class Goal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private AppUser owner;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private GoalType type;

    @Column(name = "target_value", nullable = false, precision = 6, scale = 1)
    private BigDecimal targetValue;

    @Column(name = "start_value", precision = 6, scale = 1)
    private BigDecimal startValue;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Goal() {}

    public Goal(AppUser owner, GoalType type, BigDecimal targetValue, BigDecimal startValue,
                LocalDate startDate, LocalDate targetDate) {
        this.owner = owner;
        this.type = type;
        this.targetValue = targetValue;
        this.startValue = startValue;
        this.startDate = startDate;
        this.targetDate = targetDate;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }

    public AppUser getOwner() { return owner; }

    public GoalType getType() { return type; }

    public void setType(GoalType type) { this.type = type; }

    public BigDecimal getTargetValue() { return targetValue; }

    public void setTargetValue(BigDecimal targetValue) { this.targetValue = targetValue; }

    public BigDecimal getStartValue() { return startValue; }

    public void setStartValue(BigDecimal startValue) { this.startValue = startValue; }

    public LocalDate getStartDate() { return startDate; }

    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getTargetDate() { return targetDate; }

    public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }

    public Instant getCreatedAt() { return createdAt; }
}
