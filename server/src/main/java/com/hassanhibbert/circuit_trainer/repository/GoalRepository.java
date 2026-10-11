package com.hassanhibbert.circuit_trainer.repository;

import com.hassanhibbert.circuit_trainer.entity.Goal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findByOwnerIdOrderByIdAsc(Long ownerId);

    Optional<Goal> findByIdAndOwnerId(Long id, Long ownerId);

    long countByOwnerId(Long ownerId);
}
