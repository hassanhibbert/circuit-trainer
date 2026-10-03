package com.hassanhibbert.circuit_trainer.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "body_weights")
public class BodyWeight {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private AppUser owner;

    // LocalDate maps to a DATE column: a day on the calendar, with no time or zone attached.
    @Column(name = "measured_on", nullable = false)
    private LocalDate measuredOn;

    @Column(name = "weight_lb", nullable = false, precision = 5, scale = 1)
    private BigDecimal weightLb;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected BodyWeight() {}

    public BodyWeight(AppUser owner, LocalDate measuredOn, BigDecimal weightLb, String note) {
        this.owner = owner;
        this.measuredOn = measuredOn;
        this.weightLb = weightLb;
        this.note = note;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }

    public AppUser getOwner() { return owner; }

    public LocalDate getMeasuredOn() { return measuredOn; }

    public void setMeasuredOn(LocalDate measuredOn) { this.measuredOn = measuredOn; }

    public BigDecimal getWeightLb() { return weightLb; }

    public void setWeightLb(BigDecimal weightLb) { this.weightLb = weightLb; }

    public String getNote() { return note; }

    public void setNote(String note) { this.note = note; }

    public Instant getCreatedAt() { return createdAt; }
}
