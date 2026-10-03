package com.hassanhibbert.circuit_trainer.auth;

import com.hassanhibbert.circuit_trainer.entity.AppUser;
import com.hassanhibbert.circuit_trainer.exception.DuplicateResourceException;
import com.hassanhibbert.circuit_trainer.repository.AppUserRepository;
import com.hassanhibbert.circuit_trainer.security.TokenService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class AuthService {
    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    // Hash of a throwaway password, computed once. See login().
    private final String dummyHash;

    public AuthService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder,
                       TokenService tokenService) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.dummyHash = passwordEncoder.encode("timing-equalizer-password");
    }

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        if (appUserRepository.existsByUsername(request.username())) {
            throw new DuplicateResourceException("Username '" + request.username() + "' is already taken");
        }
        AppUser user = appUserRepository.save(
                new AppUser(request.username(), passwordEncoder.encode(request.password())));
        return issueFor(user);
    }

    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest request) {
        Optional<AppUser> user = appUserRepository.findByUsername(request.username());
        // Always run one BCrypt comparison, even for unknown usernames. Otherwise "no such user"
        // answers in ~1ms and "wrong password" in ~100ms, and an attacker can enumerate usernames.
        String hash = user.map(AppUser::getPasswordHash).orElse(dummyHash);
        boolean matches = passwordEncoder.matches(request.password(), hash);
        if (user.isEmpty() || !matches) {
            // Same message for both cases, for the same reason.
            throw new BadCredentialsException("Invalid username or password");
        }
        return issueFor(user.get());
    }

    private TokenResponse issueFor(AppUser user) {
        return TokenResponse.bearer(tokenService.issue(user), tokenService.ttlSeconds(), user.getUsername());
    }
}
