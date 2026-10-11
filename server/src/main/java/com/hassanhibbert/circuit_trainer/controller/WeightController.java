package com.hassanhibbert.circuit_trainer.controller;

import com.hassanhibbert.circuit_trainer.dto.PageResponse;
import com.hassanhibbert.circuit_trainer.dto.WeightFilter;
import com.hassanhibbert.circuit_trainer.dto.WeightRequest;
import com.hassanhibbert.circuit_trainer.dto.WeightResponse;
import com.hassanhibbert.circuit_trainer.security.CurrentUserId;
import com.hassanhibbert.circuit_trainer.service.WeightService;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/weights")
public class WeightController {
    private final WeightService weightService;

    public WeightController(WeightService weightService) {
        this.weightService = weightService;
    }

    @GetMapping
    public PageResponse<WeightResponse> searchWeights(@ParameterObject WeightFilter filter,
                                                      @ParameterObject @PageableDefault(size = 30, sort = "measuredOn",
                                                              direction = Sort.Direction.DESC) Pageable pageable,
                                                      @CurrentUserId Long userId) {
        return weightService.search(userId, filter, pageable);
    }

    @GetMapping("/{id}")
    public WeightResponse getWeight(@PathVariable Long id, @CurrentUserId Long userId) {
        return weightService.get(id, userId);
    }

    @PostMapping
    public ResponseEntity<WeightResponse> createWeight(@Valid @RequestBody WeightRequest request,
                                                       @CurrentUserId Long userId) {
        WeightResponse created = weightService.create(request, userId);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public WeightResponse updateWeight(@PathVariable Long id, @Valid @RequestBody WeightRequest request,
                                       @CurrentUserId Long userId) {
        return weightService.update(id, request, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWeight(@PathVariable Long id, @CurrentUserId Long userId) {
        weightService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
