package com.hassanhibbert.circuit_trainer.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI at /swagger-ui.html, raw spec at /v3/api-docs. The bearer scheme adds an
 * "Authorize" button: paste the accessToken from /auth/login and every call sends it.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(title = "Circuit Trainer API", version = "v1",
                description = "Workouts, logged sessions with sets, body weight and goals."),
        security = @SecurityRequirement(name = "bearerAuth"))
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
