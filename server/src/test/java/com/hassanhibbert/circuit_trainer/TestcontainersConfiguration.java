package com.hassanhibbert.circuit_trainer;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * A real, throwaway Postgres in Docker for tests that need a database. Same engine and
 * version as production, so CHECK constraints, partial unique indexes and timestamptz behave
 * exactly as they will in prod (H2 emulates Postgres, and the emulation has gaps).
 *
 * @ServiceConnection points spring.datasource.* at the container automatically.
 * Skipped when TEST_DB_URL is set: then the tests use that existing database instead.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    @ConditionalOnExpression("'${TEST_DB_URL:}'.isEmpty()")
    PostgreSQLContainer postgresContainer() {
        return new PostgreSQLContainer("postgres:18-alpine");
    }
}
