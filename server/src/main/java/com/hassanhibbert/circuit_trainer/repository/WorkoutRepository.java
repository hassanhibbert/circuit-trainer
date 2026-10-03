package com.hassanhibbert.circuit_trainer.repository;

import com.hassanhibbert.circuit_trainer.entity.Workout;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WorkoutRepository extends JpaRepository<Workout, Long> {

    // "left join": an inner join on owner would silently drop the built-ins, whose owner is null.
    // Built-ins are listed first, then the user's own workouts in the order they were created.
    @Query("""
            select w from Workout w left join w.owner o
            where o is null or o.id = :ownerId
            order by case when o is null then 0 else 1 end, w.id
            """)
    List<Workout> findAllVisibleTo(@Param("ownerId") Long ownerId);

    /** A workout the user may read: a built-in, or one of their own. Anything else is "not found". */
    @Query("""
            select w from Workout w left join w.owner o
            where w.id = :id and (o is null or o.id = :ownerId)
            """)
    Optional<Workout> findVisibleTo(@Param("id") Long id, @Param("ownerId") Long ownerId);

    boolean existsByOwnerIdAndTitleIgnoreCase(Long ownerId, String title);

    boolean existsByOwnerIdAndTitleIgnoreCaseAndIdNot(Long ownerId, String title, Long id);

    long countByOwnerId(Long ownerId);
}
