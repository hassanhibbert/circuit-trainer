package com.hassanhibbert.circuit_trainer.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private AppUser owner;

    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected RefreshToken() {}

    public RefreshToken(AppUser owner, UUID familyId, String tokenHash, Instant createdAt, Instant expiresAt) {
        this.owner = owner;
        this.familyId = familyId;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired(Instant now) { return !expiresAt.isAfter(now); }

    public boolean isRevoked() { return revokedAt != null; }

    public boolean isUsed() { return usedAt != null; }

    public void markUsed(Instant now) { this.usedAt = now; }

    public Long getId() { return id; }

    public AppUser getOwner() { return owner; }

    public UUID getFamilyId() { return familyId; }

    public String getTokenHash() { return tokenHash; }

    public Instant getExpiresAt() { return expiresAt; }

    public Instant getUsedAt() { return usedAt; }

    public Instant getRevokedAt() { return revokedAt; }
}
