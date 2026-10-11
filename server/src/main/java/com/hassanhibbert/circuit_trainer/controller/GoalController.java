package com.hassanhibbert.circuit_trainer.controller;

import com.hassanhibbert.circuit_trainer.dto.GoalRequest;
import com.hassanhibbert.circuit_trainer.dto.GoalResponse;
import com.hassanhibbert.circuit_trainer.security.CurrentUserId;
import com.hassanhibbert.circuit_trainer.service.GoalService;
import com.hassanhibbert.circuit_trainer.service.WeekCalendar;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/goals")
public class GoalController {
    private static final String TZ_DOC = "IANA time zone used for 'today' and 'this week', e.g. America/New_York";

    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    @GetMapping
    public List<GoalResponse> listGoals(@Parameter(description = TZ_DOC) @RequestParam(defaultValue = "UTC") String tz,
                                        @CurrentUserId Long userId) {
        return goalService.list(userId, WeekCalendar.zone(tz));
    }

    @GetMapping("/{id}")
    public GoalResponse getGoal(@PathVariable Long id,
                                @Parameter(description = TZ_DOC) @RequestParam(defaultValue = "UTC") String tz,
                                @CurrentUserId Long userId) {
        return goalService.get(id, userId, WeekCalendar.zone(tz));
    }

    @PostMapping
    public ResponseEntity<GoalResponse> createGoal(@Valid @RequestBody GoalRequest request,
                                                   @Parameter(description = TZ_DOC) @RequestParam(defaultValue = "UTC") String tz,
                                                   @CurrentUserId Long userId) {
        GoalResponse created = goalService.create(request, userId, WeekCalendar.zone(tz));
        URI location = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/v1/goals/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/{id}")
    public GoalResponse updateGoal(@PathVariable Long id, @Valid @RequestBody GoalRequest request,
                                   @Parameter(description = TZ_DOC) @RequestParam(defaultValue = "UTC") String tz,
                                   @CurrentUserId Long userId) {
        return goalService.update(id, request, userId, WeekCalendar.zone(tz));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable Long id, @CurrentUserId Long userId) {
        goalService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
