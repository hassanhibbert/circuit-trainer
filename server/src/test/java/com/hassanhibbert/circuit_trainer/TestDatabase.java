package com.hassanhibbert.circuit_trainer;

import org.testcontainers.DockerClientFactory;

/**
 * Database tests run when there is a database to run them against:
 *  - Docker is available (CI, or a dev machine with Docker): a Testcontainers Postgres, or
 *  - TEST_DB_URL points at an existing Postgres, e.g. a local Postgres.app database:
 *      TEST_DB_URL=jdbc:postgresql://localhost:5432/circuit_trainer_test ./mvnw test
 * Otherwise they are skipped, not failed.
 */
public final class TestDatabase {

    private TestDatabase() {}

    public static boolean isAvailable() {
        String url = System.getenv("TEST_DB_URL");
        return (url != null && !url.isBlank()) || DockerClientFactory.instance().isDockerAvailable();
    }
}
