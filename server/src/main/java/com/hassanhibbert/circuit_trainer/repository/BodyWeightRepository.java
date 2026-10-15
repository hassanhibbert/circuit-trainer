package com.hassanhibbert.circuit_trainer.repository;

import com.hassanhibbert.circuit_trainer.entity.BodyWeight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

public interface BodyWeightRepository extends JpaRepository<BodyWeight, Long>, JpaSpecificationExecutor<BodyWeight> {
    Optional<BodyWeight> findByIdAndOwnerId(Long id, Long ownerId);

    boolean existsByOwnerIdAndMeasuredOn(Long ownerId, LocalDate measuredOn);

    boolean existsByOwnerIdAndMeasuredOnAndIdNot(Long ownerId, LocalDate measuredOn, Long id);

    Optional<BodyWeight> findFirstByOwnerIdOrderByMeasuredOnDesc(Long ownerId);

    Optional<BodyWeight> findFirstByOwnerIdOrderByMeasuredOnAsc(Long ownerId);

    Optional<BodyWeight> findFirstByOwnerIdAndMeasuredOnGreaterThanEqualOrderByMeasuredOnAsc(Long ownerId, LocalDate from);

    long countByOwnerId(Long ownerId);

    @Query("select min(b.weightLb) from BodyWeight b where b.owner.id = :ownerId")
    BigDecimal lowestWeight(@Param("ownerId") Long ownerId);

    @Modifying(clearAutomatically = true)
    @Query("delete from BodyWeight b where b.owner.id = :ownerId")
    int deleteAllOwnedBy(@Param("ownerId") Long ownerId);
}
