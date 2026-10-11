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

    List<WorkoutSession> findByOwnerIdOrderByCompletedAtAsc(Long ownerId);

    long countByOwnerId(Long ownerId);

    long countByOwnerIdAndCompletedAtGreaterThanEqual(Long ownerId, Instant from);

    @Query("select coalesce(sum(s.totalSeconds), 0) from WorkoutSession s where s.owner.id = :ownerId")
    long sumTotalSeconds(@Param("ownerId") Long ownerId);

    @Query("""
            select coalesce(sum(ss.reps * ss.weightLb), 0) from SessionSet ss
            where ss.session.owner.id = :ownerId and ss.reps is not null and ss.weightLb is not null
            """)
    BigDecimal sumVolumeLb(@Param("ownerId") Long ownerId);

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
