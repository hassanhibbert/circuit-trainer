package com.hassanhibbert.circuit_trainer.security;

import com.hassanhibbert.circuit_trainer.entity.AppUser;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class TokenService {
    public static final String DEMO_USERNAME = "Demo Trainer";
    public static final String DEMO_SCOPE = "demo";

    private final JwtEncoder jwtEncoder;
    private final JwtProperties properties;

    public TokenService(JwtEncoder jwtEncoder, JwtProperties properties) {
        this.jwtEncoder = jwtEncoder;
        this.properties = properties;
    }

    public String issue(AppUser user) {
        return issue(user.getId(), user.getUsername());
    }

    public String issue(Long userId, String username) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(properties.issuer())
                .subject(userId.toString())
                .claim("username", username)
                .issuedAt(now)
                .expiresAt(now.plus(properties.ttl()));
        // spring turns scope into a SCOPE_demo authority, SecurityConfig blocks writes for it.
        // decided here so a refreshed demo token is still read-only
        if (isDemo(username)) {
            claims.claim("scope", DEMO_SCOPE);
        }
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }

    public static boolean isDemo(String username) {
        return DEMO_USERNAME.equals(username);
    }

    public long ttlSeconds() {
        return properties.ttl().toSeconds();
    }
}
