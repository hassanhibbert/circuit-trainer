package com.hassanhibbert.circuit_trainer.controller;

import com.hassanhibbert.circuit_trainer.dto.ImportRequest;
import com.hassanhibbert.circuit_trainer.dto.ImportResult;
import com.hassanhibbert.circuit_trainer.dto.PageResponse;
import com.hassanhibbert.circuit_trainer.dto.SessionFilter;
import com.hassanhibbert.circuit_trainer.dto.SessionRequest;
import com.hassanhibbert.circuit_trainer.dto.SessionResponse;
import com.hassanhibbert.circuit_trainer.security.CurrentUserId;
import com.hassanhibbert.circuit_trainer.service.SessionService;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/sessions")
public class SessionController {
    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    public PageResponse<SessionResponse> searchSessions(@ParameterObject SessionFilter filter,
                                                        @ParameterObject @PageableDefault(size = 20, sort = "completedAt",
                                                                direction = Sort.Direction.DESC) Pageable pageable,
                                                        @CurrentUserId Long userId) {
        return sessionService.search(userId, filter, pageable);
    }

    @GetMapping("/export")
    public List<SessionResponse> exportSessions(@CurrentUserId Long userId) {
        return sessionService.exportAll(userId);
    }

    @GetMapping("/{id}")
    public SessionResponse getSession(@PathVariable Long id, @CurrentUserId Long userId) {
        return sessionService.get(id, userId);
    }

    @PostMapping
    public ResponseEntity<SessionResponse> createSession(@Valid @RequestBody SessionRequest request,
                                                         @CurrentUserId Long userId) {
        SessionResponse created = sessionService.create(request, userId);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(created.id()).toUri();
        return ResponseEntity.created(location).body(created);
    }

    @PostMapping("/import")
    public ImportResult importSessions(@Valid @RequestBody ImportRequest request, @CurrentUserId Long userId) {
        return sessionService.importHistory(request, userId);
    }

    @PutMapping("/{id}")
    public SessionResponse updateSession(@PathVariable Long id, @Valid @RequestBody SessionRequest request,
                                         @CurrentUserId Long userId) {
        return sessionService.update(id, request, userId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable Long id, @CurrentUserId Long userId) {
        sessionService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
