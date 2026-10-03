package com.hassanhibbert.circuit_trainer.controller;

import com.hassanhibbert.circuit_trainer.dto.stats.StatsResponse;
import com.hassanhibbert.circuit_trainer.security.CurrentUserId;
import com.hassanhibbert.circuit_trainer.service.StatsService;
import com.hassanhibbert.circuit_trainer.service.WeekCalendar;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stats")
public class StatsController {
    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping
    public StatsResponse getStats(@Parameter(description = "IANA time zone for 'this week', e.g. America/New_York")
                                  @RequestParam(defaultValue = "UTC") String tz,
                                  @CurrentUserId Long userId) {
        return statsService.summary(userId, WeekCalendar.zone(tz));
    }
}
