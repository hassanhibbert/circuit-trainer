package com.hassanhibbert.circuit_trainer.repository;

import com.hassanhibbert.circuit_trainer.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkoutRepository extends JpaRepository<Workout, Long> {
    // left join, built-ins have no owner
    @Query("""
            select w from Workout w left join w.owner o
            where o is null or o.id = :ownerId
            order by case when o is null then 0 else 1 end, w.id
            """)
    List<Workout> findAllVisibleTo(@Param("ownerId") Long ownerId);

    @Query("""
            select w from Workout w left join w.owner o
            where w.id = :id and (o is null or o.id = :ownerId)
            """)
    Optional<Workout> findVisibleTo(@Param("id") Long id, @Param("ownerId") Long ownerId);

    boolean existsByOwnerIdAndTitleIgnoreCase(Long ownerId, String title);

    boolean existsByOwnerIdAndTitleIgnoreCaseAndIdNot(Long ownerId, String title, Long id);

    long countByOwnerId(Long ownerId);
}
