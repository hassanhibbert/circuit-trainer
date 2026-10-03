package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.PageResponse;
import com.hassanhibbert.circuit_trainer.dto.WeightFilter;
import com.hassanhibbert.circuit_trainer.dto.WeightRequest;
import com.hassanhibbert.circuit_trainer.dto.WeightResponse;
import com.hassanhibbert.circuit_trainer.entity.BodyWeight;
import com.hassanhibbert.circuit_trainer.exception.BusinessRuleException;
import com.hassanhibbert.circuit_trainer.exception.DuplicateResourceException;
import com.hassanhibbert.circuit_trainer.exception.InvalidQueryException;
import com.hassanhibbert.circuit_trainer.exception.ResourceNotFoundException;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import com.hassanhibbert.circuit_trainer.repository.BodyWeightRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class WeightService {
    static final Set<String> SORTABLE = Set.of("measuredOn", "weightLb");

    private final BodyWeightRepository weightRepository;
    private final AppUserRepository appUserRepository;
    private final Clock clock;

    public WeightService(BodyWeightRepository weightRepository, AppUserRepository appUserRepository, Clock clock) {
        this.weightRepository = weightRepository;
        this.appUserRepository = appUserRepository;
        this.clock = clock;
    }

    public PageResponse<WeightResponse> search(Long ownerId, WeightFilter filter, Pageable pageable) {
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE.contains(order.getProperty())) {
                throw new InvalidQueryException("Cannot sort by '" + order.getProperty() + "'. Allowed: " + SORTABLE);
            }
        }
        List<Specification<BodyWeight>> specs = new ArrayList<>();
        specs.add((root, query, cb) -> cb.equal(root.get("owner").get("id"), ownerId));
        if (filter.from() != null) {
            specs.add((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("measuredOn"), filter.from()));
        }
        if (filter.to() != null) {
            specs.add((root, query, cb) -> cb.lessThanOrEqualTo(root.get("measuredOn"), filter.to()));
        }
        Pageable stable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                pageable.getSort().and(Sort.by(Sort.Direction.DESC, "id")));
        return PageResponse.from(weightRepository.findAll(Specification.allOf(specs), stable), WeightResponse::fromEntity);
    }

    public WeightResponse get(Long id, Long ownerId) {
        return WeightResponse.fromEntity(getEntity(id, ownerId));
    }

    @Transactional
    public WeightResponse create(WeightRequest request, Long ownerId) {
        checkDate(request.measuredOn());
        if (weightRepository.existsByOwnerIdAndMeasuredOn(ownerId, request.measuredOn())) {
            throw new DuplicateResourceException("A weight for " + request.measuredOn() + " is already logged; update it instead");
        }
        BodyWeight weight = new BodyWeight(appUserRepository.getReferenceById(ownerId), request.measuredOn(),
                request.weightLb(), blankToNull(request.note()));
        return WeightResponse.fromEntity(weightRepository.save(weight));
    }

    @Transactional
    public WeightResponse update(Long id, WeightRequest request, Long ownerId) {
        checkDate(request.measuredOn());
        BodyWeight weight = getEntity(id, ownerId);
        if (weightRepository.existsByOwnerIdAndMeasuredOnAndIdNot(ownerId, request.measuredOn(), id)) {
            throw new DuplicateResourceException("A weight for " + request.measuredOn() + " is already logged");
        }
        weight.setMeasuredOn(request.measuredOn());
        weight.setWeightLb(request.weightLb());
        weight.setNote(blankToNull(request.note()));
        return WeightResponse.fromEntity(weight);
    }

    @Transactional
    public void delete(Long id, Long ownerId) {
        weightRepository.delete(getEntity(id, ownerId));
    }

    /**
     * Not @PastOrPresent: that compares with the server's date (UTC), and for a user east of UTC
     * "today" can already be "tomorrow" in UTC terms. The furthest-ahead zone is UTC+14, so allow +1 day.
     */
    private void checkDate(LocalDate measuredOn) {
        if (measuredOn.isAfter(LocalDate.now(clock.withZone(ZoneOffset.UTC)).plusDays(1))) {
            throw new BusinessRuleException("measuredOn can't be in the future");
        }
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BodyWeight getEntity(Long id, Long ownerId) {
        return weightRepository.findByIdAndOwnerId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Weight entry", id));
    }
}
