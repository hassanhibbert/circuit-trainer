package com.hassanhibbert.circuit_trainer.dto;

import org.springframework.data.domain.Page;

import java.util.List;
import java.util.function.Function;

/**
 * A stable JSON shape for paged results. Serializing Spring's Page directly leaks its
 * internal structure into the API, and that structure can change between versions.
 *
 * Generic over T: one class serves PageResponse<SessionResponse>, PageResponse<WeightResponse>, ...
 */
public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    /** <E> is the entity type in the page, T the DTO type each element is mapped to. */
    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(page.getContent().stream().map(mapper).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }
}
