package com.hassanhibbert.circuit_trainer.repository;

import com.hassanhibbert.circuit_trainer.dto.SessionFilter;
import com.hassanhibbert.circuit_trainer.entity.WorkoutSession;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds a WHERE clause from whichever filters are present. Each Specification is a lambda
 * (root, query, criteriaBuilder) -> Predicate, and the values become bind parameters,
 * so user input never becomes part of the SQL text.
 */
public final class SessionSpecifications {

    private SessionSpecifications() {}

    public static Specification<WorkoutSession> matching(Long ownerId, SessionFilter filter) {
        List<Specification<WorkoutSession>> specs = new ArrayList<>();
        // Always first, never optional: this is what keeps users inside their own data.
        specs.add((root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId));

        if (filter.workoutId() != null) {
            specs.add((root, query, cb) -> cb.equal(root.get("workout").get("id"), filter.workoutId()));
        }
        if (filter.from() != null) {
            specs.add((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("completedAt"), filter.from()));
        }
        if (filter.to() != null) {
            specs.add((root, query, cb) -> cb.lessThan(root.get("completedAt"), filter.to()));
        }
        return Specification.allOf(specs);
    }
}
