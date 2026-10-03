package com.hassanhibbert.circuit_trainer.service;

import com.hassanhibbert.circuit_trainer.dto.AccountResponse;
import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.exception.ResourceNotFoundException;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AccountService {
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;

    public AccountService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AccountResponse get(Long userId) {
        AppUser user = getEntity(userId);
        return new AccountResponse(user.getId(), user.getUsername(), user.getCreatedAt());
    }

    /**
     * Deletes the user row; ON DELETE CASCADE in the schema removes their workouts, sessions,
     * sets, weights and goals in the same statement. Their existing tokens still verify until
     * they expire, but every query is scoped to an owner that no longer exists, so they see nothing.
     */
    @Transactional
    public void delete(Long userId, String password) {
        AppUser user = getEntity(userId);
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Password is incorrect");
        }
        appUserRepository.delete(user);
    }

    private AppUser getEntity(Long userId) {
        return appUserRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }
}
