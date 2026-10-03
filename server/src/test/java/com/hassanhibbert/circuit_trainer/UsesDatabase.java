package com.hassanhibbert.circuit_trainer;

import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * A composed annotation: one line on a test class bundles the test profile, the database
 * configuration and the "only if a database is available" condition. Both JUnit and Spring
 * look through annotations on annotations ("meta-annotations"), so this just works.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@EnabledIf("com.hassanhibbert.circuit_trainer.TestDatabase#isAvailable")
public @interface UsesDatabase {
}
