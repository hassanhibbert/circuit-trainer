package com.hassanhibbert.circuit_trainer;

import org.testcontainers.DockerClientFactory;

public final class TestDatabase {
    private TestDatabase() {}

    public static boolean isAvailable() {
        String url = System.getenv("TEST_DB_URL");
        return (url != null && !url.isBlank()) || DockerClientFactory.instance().isDockerAvailable();
    }
}
