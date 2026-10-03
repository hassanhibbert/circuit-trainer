package com.hassanhibbert.circuit_trainer.controller;

import com.hassanhibbert.circuit_trainer.dto.AccountResponse;
import com.hassanhibbert.circuit_trainer.dto.DeleteAccountRequest;
import com.hassanhibbert.circuit_trainer.security.CurrentUserId;
import com.hassanhibbert.circuit_trainer.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** The signed-in user's own account. */
@RestController
@RequestMapping("/api/v1/me")
public class AccountController {
    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    public AccountResponse getAccount(@CurrentUserId Long userId) {
        return accountService.get(userId);
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteAccount(@Valid @RequestBody DeleteAccountRequest request,
                                              @CurrentUserId Long userId) {
        accountService.delete(userId, request.password());
        return ResponseEntity.noContent().build();
    }
}
