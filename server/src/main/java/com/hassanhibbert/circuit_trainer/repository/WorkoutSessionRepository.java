package com.hassanhibbert.circuit_trainer.repository;

import com.hassanhibbert.circuit_trainer.dto.stats.WorkoutStat;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long>,
        JpaSpecificationExecutor<WorkoutSession> {

    Optional<WorkoutSession> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByOwnerIdAndWorkoutTitleAndCompletedAt(Long ownerId, String workoutTitle, Instant completedAt);

    @Query("select new com.hassanhibbert.circuit_trainer.repository.CompletionKey(s.workoutTitle, s.completedAt) "
            + "from WorkoutSession s where s.owner.id = :ownerId")
    List<CompletionKey> findCompletionKeys(@Param("ownerId") Long ownerId);

    /** Everything, oldest first, for export. Sets are batch-fetched when the DTOs are built. */
    List<WorkoutSession> findByOwnerIdOrderByCompletedAtAsc(Long ownerId);

    long countByOwnerId(Long ownerId);

    long countByOwnerIdAndCompletedAtGreaterThanEqual(Long ownerId, Instant from);

    // sum() of an Integer column is a Long in JPQL; coalesce turns "no rows" (null) into 0.
    @Query("select coalesce(sum(s.totalSeconds), 0) from WorkoutSession s where s.owner.id = :ownerId")
    long sumTotalSeconds(@Param("ownerId") Long ownerId);

    // Integer * BigDecimal is a BigDecimal in JPQL, so the sum is exact.
    @Query("""
            select coalesce(sum(ss.reps * ss.weightLb), 0) from SessionSet ss
            where ss.session.owner.id = :ownerId and ss.reps is not null and ss.weightLb is not null
            """)
    BigDecimal sumVolumeLb(@Param("ownerId") Long ownerId);

    // Constructor expression with group by: the database counts; Hibernate never loads a session.
    // Inner join on workout: sessions whose workout is gone (or never matched) are left out.
    @Query("""
            select new com.hassanhibbert.circuit_trainer.dto.stats.WorkoutStat(
                w.id, w.title, count(s), min(s.completedAt), max(s.completedAt), w.programWeeks)
            from WorkoutSession s join s.workout w
            where s.owner.id = :ownerId
            group by w.id, w.title, w.programWeeks
            order by max(s.completedAt) desc
            """)
    List<WorkoutStat> statsByWorkout(@Param("ownerId") Long ownerId);
}
