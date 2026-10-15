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
    private final RefreshTokenService refreshTokenService;
    private final AuthRateLimiter rateLimiter;
    private final String dummyHash;

    public AuthService(AppUserRepository appUserRepository, PasswordEncoder passwordEncoder, TokenService tokenService,
                       RefreshTokenService refreshTokenService, AuthRateLimiter rateLimiter) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.refreshTokenService = refreshTokenService;
        this.rateLimiter = rateLimiter;
        this.dummyHash = passwordEncoder.encode("timing-equalizer-password");
    }

    @Transactional
    public AuthResult register(RegisterRequest request, String clientIp) {
        rateLimiter.checkRegister(clientIp);
        if (appUserRepository.existsByUsername(request.username())) {
            throw new DuplicateResourceException("Username '" + request.username() + "' is already taken");
        }
        AppUser user = appUserRepository.save(
                new AppUser(request.username(), passwordEncoder.encode(request.password())));
        return issueFor(user);
    }

    @Transactional
    public AuthResult login(LoginRequest request, String clientIp) {
        rateLimiter.checkLogin(clientIp, request.username());
        Optional<AppUser> user = appUserRepository.findByUsername(request.username());
        // always run bcrypt so unknown usernames take as long as wrong passwords
        String hash = user.map(AppUser::getPasswordHash).orElse(dummyHash);
        boolean matches = passwordEncoder.matches(request.password(), hash);
        if (user.isEmpty() || !matches) {
            throw new BadCredentialsException("Invalid username or password");
        }
        rateLimiter.loginSucceeded(request.username());
        return issueFor(user.get());
    }

    // one click, no password. the demo user's real password is random and never stored
    @Transactional
    public AuthResult demo(String clientIp) {
        rateLimiter.checkDemo(clientIp);
        AppUser demo = appUserRepository.findByUsername(TokenService.DEMO_USERNAME)
                .orElseThrow(() -> new IllegalStateException("Demo account missing, it's created at startup"));
        return issueFor(demo);
    }

    public AuthResult refresh(String refreshToken) {
        RefreshTokenService.Rotation rotation = refreshTokenService.rotate(refreshToken);
        return new AuthResult(accessToken(rotation.userId(), rotation.username()), rotation.refreshToken());
    }

    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    private AuthResult issueFor(AppUser user) {
        return new AuthResult(accessToken(user.getId(), user.getUsername()), refreshTokenService.issue(user));
    }

    private TokenResponse accessToken(Long userId, String username) {
        return TokenResponse.bearer(tokenService.issue(userId, username), tokenService.ttlSeconds(), username,
                TokenService.isDemo(username));
    }
}
