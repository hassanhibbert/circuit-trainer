package com.hassanhibbert.circuit_trainer.controller;

import com.hassanhibbert.circuit_trainer.dto.WorkoutRequest;
import com.hassanhibbert.circuit_trainer.dto.WorkoutResponse;
import com.hassanhibbert.circuit_trainer.security.CurrentUserId;
import com.hassanhibbert.circuit_trainer.service.WorkoutService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/workouts")
public class WorkoutController {
    private final WorkoutService workoutService;

    public WorkoutController(WorkoutService workoutService) {
        this.workoutService = workoutService;
    }

    @GetMapping
    public List<WorkoutResponse> listWorkouts(@CurrentUserId Long userId) {
        return workoutService.listVisible(userId);
    }

    @GetMapping("/{id}")
    public WorkoutResponse getWorkout(@PathVariable Long id, @CurrentUserId Long userId) {
        return workoutService.get(id, userId);
    }

    @PostMapping
    public ResponseEntity<WorkoutResponse> createWorkout(@Valid @RequestBody WorkoutRequest request,
                                                         @CurrentUserId Long userId) {
        return created(workoutService.create(request, userId));
    }

    @PutMapping("/{id}")
    public WorkoutResponse updateWorkout(@PathVariable Long id, @Valid @RequestBody WorkoutRequest request,
                                         @CurrentUserId Long userId) {
        return workoutService.update(id, request, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWorkout(@PathVariable Long id, @CurrentUserId Long userId) {
        workoutService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/copy")
    public ResponseEntity<WorkoutResponse> copyWorkout(@PathVariable Long id, @CurrentUserId Long userId) {
        return created(workoutService.copy(id, userId));
    }

    private static ResponseEntity<WorkoutResponse> created(WorkoutResponse workout) {
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/workouts/{id}").buildAndExpand(workout.id()).toUri();
        return ResponseEntity.created(location).body(workout);
    }
}
